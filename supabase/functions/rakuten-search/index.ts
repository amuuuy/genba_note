/**
 * Supabase Edge Function: rakuten-search
 *
 * Proxies requests to the Rakuten Ichiba Item Search API.
 * Keeps the RAKUTEN_APP_ID server-side for security.
 *
 * Security:
 * - Requires Supabase JWT auth (verify_jwt=true in config)
 * - Per-IP rate limiting (10 requests per minute)
 * - Input validation with NaN protection
 * - Native app only — no CORS headers (browser preflight will receive 405)
 *
 * Deploy: supabase functions deploy rakuten-search
 * JWT verification: Configured in supabase/config.toml (verify_jwt=true)
 * Secret: supabase secrets set RAKUTEN_APP_ID=<your_key>
 */

import { extractUserId } from '../_shared/auth.ts';
import { createDailyLimiter } from '../_shared/dailyLimit.ts';

const RAKUTEN_API_URL =
  'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601';

// Daily usage limit per user (server-side universal cap)
const DAILY_LIMIT = 100;
const MAX_TRACKED_USERS = 50_000;
const dailyLimiter = createDailyLimiter({ maxPerDay: DAILY_LIMIT, maxTrackedUsers: MAX_TRACKED_USERS });

/** @internal Reset daily limiter for testing. */
export function resetDailyLimiter(): void { dailyLimiter.reset(); }

// Rate limiter: 10 req/min per IP
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const MAX_TRACKED_IPS = 10_000;
/** @internal Exported for testing only. */
export const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 10_000; // Throttle cleanup to every 10 seconds

/** @internal Reset rate limiter state for testing. */
export function resetRateLimiter(): void {
  rateLimitMap.clear();
  lastCleanupAt = 0;
}

/** @internal Set lastCleanupAt for testing (to simulate recent cleanup). */
export function setLastCleanupAtForTest(ts: number): void {
  lastCleanupAt = ts;
}

/** @internal Exported for testing only. */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Prune expired entries (throttled to avoid O(n) on every request)
  if (rateLimitMap.size > 1000 && now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now;
    for (const [key, val] of rateLimitMap) {
      if (now >= val.resetAt) rateLimitMap.delete(key);
    }
  }

  // Hard cap: fail-closed when too many tracked IPs (DDoS / abuse scenario)
  // Throttled: only force-clean once per CLEANUP_INTERVAL to avoid O(n) on every request
  if (rateLimitMap.size >= MAX_TRACKED_IPS && !rateLimitMap.has(ip)) {
    if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
      for (const [key, val] of rateLimitMap) {
        if (now >= val.resetAt) rateLimitMap.delete(key);
      }
      lastCleanupAt = now;
    }
    if (rateLimitMap.size >= MAX_TRACKED_IPS) {
      return false;
    }
  }

  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

interface RequestBody {
  keyword: string;
  page?: number;
  hits?: number;
}

/** Exported for testing. */
export async function handler(req: Request): Promise<Response> {
  return handleRequest(req);
}

// Guard: only start the HTTP server when run as main entry point.
// Importing this module from tests must NOT start a listener.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    return handleRequest(req);
  });
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Auth: require authenticated user JWT (reject anon key)
  const userId = extractUserId(req);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: valid user authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Rate limiting by client IP (burst protection — does not consume daily quota)
  // Priority: cf-connecting-ip (Cloudflare, cannot be spoofed) > x-forwarded-for (first hop)
  const clientIp = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  if (clientIp === 'unknown') {
    console.warn('No IP header found — all requests share a single rate-limit bucket');
  }

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Daily usage limit per user (sustained usage cap, separate from per-minute IP limit)
  if (!dailyLimiter.checkAndIncrement(userId)) {
    return new Response(
      JSON.stringify({ error: 'daily_limit_exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { keyword, page, hits } = body;

    // Validate keyword
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'keyword is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Validate pagination with NaN protection
    const rawPage = Number(page ?? 1);
    const rawHits = Number(hits ?? 20);

    if (!Number.isFinite(rawPage) || !Number.isFinite(rawHits)) {
      return new Response(
        JSON.stringify({ error: 'page and hits must be valid numbers' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const safePage = Math.max(1, Math.min(100, Math.floor(rawPage)));
    const safeHits = Math.max(1, Math.min(30, Math.floor(rawHits)));

    // Get API key from environment
    const applicationId = Deno.env.get('RAKUTEN_APP_ID');
    if (!applicationId) {
      console.error('RAKUTEN_APP_ID is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Build Rakuten API URL
    const params = new URLSearchParams({
      applicationId,
      keyword: keyword.trim(),
      hits: safeHits.toString(),
      page: safePage.toString(),
      formatVersion: '2',
    });

    const rakutenUrl = `${RAKUTEN_API_URL}?${params.toString()}`;
    const response = await fetch(rakutenUrl);

    if (!response.ok) {
      const status = response.status;
      // Log status only — avoid logging upstream body which may contain PII
      console.error(`Rakuten API error: ${status}`);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ error: 'External API error' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Log error type only — err.message may contain rakutenUrl with RAKUTEN_APP_ID
    const tag = err instanceof Error ? err.name : 'UnknownError';
    console.error('Edge function error:', tag);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
