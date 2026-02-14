/**
 * Supabase Edge Function: gemini-search
 *
 * Proxies requests to the Gemini API with Google Search grounding
 * for construction material price research.
 *
 * Security:
 * - Requires Supabase JWT auth (verify_jwt=true in config)
 * - Per-IP rate limiting (5 requests per minute — cost management)
 * - Input validation
 *
 * Deploy: supabase functions deploy gemini-search --verify-jwt
 * Secret: supabase secrets set GEMINI_API_KEY=<your_key>
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rate limiter: 5 req/min per IP (stricter than Rakuten to manage AI costs)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
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

/** Gemini model IDs */
const MODEL_IDS: Record<string, string> = {
  FLASH: 'gemini-2.5-flash-preview-05-20',
  PRO: 'gemini-2.5-pro-preview-05-06',
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
    const { query, model = 'FLASH' } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate model
    const modelId = MODEL_IDS[model] ?? MODEL_IDS.FLASH;

    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Gemini API request
    const geminiUrl = `${GEMINI_API_BASE}/models/${modelId}:generateContent?key=${apiKey}`;

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

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!response.ok) {
      const status = response.status;
      console.error(`Gemini API error: ${status}`);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI API rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI API error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? '';
    const groundingMetadata = candidate?.groundingMetadata ?? {};

    // Extract grounding sources
    const sources = (groundingMetadata.groundingChunks ?? []).map(
      (chunk: { web?: { uri?: string; title?: string } }) => ({
        uri: chunk.web?.uri ?? '',
        title: chunk.web?.title ?? '',
      })
    );

    return new Response(
      JSON.stringify({
        text,
        sources,
        model,
        webSearchQueries: groundingMetadata.webSearchQueries ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
