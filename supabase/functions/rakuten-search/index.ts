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
 *
 * Deploy: supabase functions deploy rakuten-search --verify-jwt
 * Secret: supabase secrets set RAKUTEN_APP_ID=<your_key>
 */

const RAKUTEN_API_URL =
  'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple in-memory rate limiter (per IP, 10 req/min)
// Logic mirrors genba-note/src/domain/materialResearch/rateLimiter.ts (tested in Jest)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limiting by client IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('cf-connecting-ip')
    ?? 'unknown';

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { keyword, page, hits } = body;

    // Validate keyword
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'keyword is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate pagination with NaN protection
    const rawPage = Number(page ?? 1);
    const rawHits = Number(hits ?? 20);

    if (!Number.isFinite(rawPage) || !Number.isFinite(rawHits)) {
      return new Response(
        JSON.stringify({ error: 'page and hits must be valid numbers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.error(`Rakuten API error: ${status}`);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'External API error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
