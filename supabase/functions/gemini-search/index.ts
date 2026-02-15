/**
 * Supabase Edge Function: gemini-search
 *
 * Proxies requests to the Gemini API with Google Search grounding
 * for construction material price research.
 *
 * Security:
 * - Requires Supabase JWT auth (verify_jwt=true in config)
 * - Per-IP rate limiting (5 requests per minute — cost management)
 * - Input validation (length, type, JSON structure)
 * - API key sent via header (not URL query param)
 *
 * Deploy: supabase functions deploy gemini-search --verify-jwt
 * Secret: supabase secrets set GEMINI_API_KEY=<your_key>
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const QUERY_MAX_LENGTH = 500;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rate limiter: 5 req/min per IP (stricter than Rakuten to manage AI costs)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
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
  // Force cleanup on cap hit to avoid false 429 when expired entries occupy space
  if (rateLimitMap.size >= MAX_TRACKED_IPS && !rateLimitMap.has(ip)) {
    for (const [key, val] of rateLimitMap) {
      if (now >= val.resetAt) rateLimitMap.delete(key);
    }
    lastCleanupAt = now;
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

/** Gemini model IDs (stable versions) */
const MODEL_IDS: Record<string, string> = {
  FLASH: 'gemini-2.5-flash',
  PRO: 'gemini-2.5-pro',
};

interface RequestBody {
  query: string;
  model?: 'FLASH' | 'PRO';
}

const SYSTEM_PROMPT = `あなたは建設資材の価格調査の専門家です。
ユーザーが入力した建設資材について、Web上の最新情報を検索し、価格情報を提供してください。

回答は必ず以下のJSON形式のブロックを含めてください:

\`\`\`json
{
  "items": [
    {
      "name": "商品名（型番やサイズ含む）",
      "price": 価格（数値、円単位）,
      "taxIncluded": true または false,
      "sourceName": "販売元・情報元の名前",
      "sourceUrl": "商品ページのURL（分かる場合、不明なら null）"
    }
  ],
  "recommendedPriceRange": {
    "min": 最低価格,
    "max": 最高価格
  },
  "summary": "1-3文の価格分析サマリー（相場感、おすすめの購入先など）"
}
\`\`\`

ルール:
- 3〜5件の価格情報を返してください
- 価格は日本円で表示
- 税込/税抜を明記（不明な場合は taxIncluded: true と仮定）
- 建設業向けの仕入れ価格や一般販売価格を含めてください
- 信頼できる情報源（モノタロウ、Amazon、楽天、専門店など）を優先してください
- 品番、サイズ、材質が指定されている場合はそれに合致する商品を優先してください
- JSON以外のテキストは summary フィールドに含めてください`;

function jsonResponse(body: Record<string, unknown>, status: number, extraHeaders?: Record<string, string>) {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders } }
  );
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Rate limiting by client IP
  // Priority: cf-connecting-ip (Cloudflare, cannot be spoofed) > x-forwarded-for (first hop)
  // Note: rakuten-search uses x-forwarded-for first; here we prefer cf-connecting-ip for security
  const clientIp = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  if (clientIp === 'unknown') {
    console.warn('No IP header found — all requests share a single rate-limit bucket');
  }

  if (!checkRateLimit(clientIp)) {
    return jsonResponse(
      { error: 'Rate limit exceeded. Try again later.' },
      429,
      { 'Retry-After': '60' }
    );
  }

  // Parse request body (explicit error handling for malformed JSON)
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: 'Request body must be a JSON object' }, 400);
  }

  try {
    const { query, model = 'FLASH' } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return jsonResponse({ error: 'query is required' }, 400);
    }

    if (query.trim().length > QUERY_MAX_LENGTH) {
      return jsonResponse(
        { error: `query must be ${QUERY_MAX_LENGTH} characters or less` },
        400
      );
    }

    // Validate model (strict allowlist to prevent prototype key injection)
    const validModel = typeof model === 'string' && Object.hasOwn(MODEL_IDS, model);
    if (!validModel) {
      console.warn(`Unknown model "${String(model)}", falling back to FLASH`);
    }
    const resolvedModel = validModel ? model : 'FLASH';
    const resolvedModelId = MODEL_IDS[resolvedModel];

    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    // Build Gemini API request (API key via header, not URL query param)
    const geminiUrl = `${GEMINI_API_BASE}/models/${resolvedModelId}:generateContent`;

    const geminiBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${query.trim()} の建設資材としての価格を調査してください。` }],
        },
      ],
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    };

    // Timeout guard: prevent indefinite hangs on upstream
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(geminiBody),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        console.error('Gemini API timeout (15s)');
        return jsonResponse({ error: 'AI API timeout' }, 504);
      }
      throw fetchErr; // re-throw for outer catch
    }
    clearTimeout(timeout);

    if (!response.ok) {
      const status = response.status;
      // Log status only — avoid logging upstream body which may contain PII
      console.error(`Gemini API error: ${status}`);

      if (status === 429) {
        return jsonResponse({ error: 'AI API rate limit exceeded' }, 429);
      }

      return jsonResponse({ error: 'AI API error' }, 502);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts;
    const text = (Array.isArray(parts) ? parts : [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('');
    const groundingMetadata = candidate?.groundingMetadata ?? {};

    // Extract grounding sources (defensive: guard against non-array upstream data)
    const chunks = groundingMetadata.groundingChunks;
    const sources = (Array.isArray(chunks) ? chunks : []).map(
      (chunk: { web?: { uri?: string; title?: string } }) => ({
        uri: chunk.web?.uri ?? '',
        title: chunk.web?.title ?? '',
      })
    );

    return jsonResponse(
      {
        text,
        sources,
        model: resolvedModel,
        webSearchQueries: Array.isArray(groundingMetadata.webSearchQueries)
          ? groundingMetadata.webSearchQueries
          : [],
      },
      200
    );
  } catch (err) {
    // Sanitize error log to avoid leaking sensitive data (e.g. API keys in URLs)
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Edge function error:', message);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}
