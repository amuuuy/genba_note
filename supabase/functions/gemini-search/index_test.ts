/**
 * Tests for gemini-search Edge Function
 *
 * Verifies rate limiting, input validation, and model fallback behavior.
 * Run with: deno test --allow-env --allow-net supabase/functions/gemini-search/index_test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handler, checkRateLimit, rateLimitMap, resetRateLimiter, setLastCleanupAtForTest } from './index.ts';

// --- Helpers ---

/** Save and restore GEMINI_API_KEY + globalThis.fetch around a test body. */
async function withStubs(
  fn: () => Promise<void> | void
): Promise<void> {
  const savedKey = Deno.env.get('GEMINI_API_KEY');
  const savedFetch = globalThis.fetch;
  Deno.env.set('GEMINI_API_KEY', 'test-key');
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{
            content: { parts: [{ text: '```json\n{"items":[],"summary":"ok"}\n```' }] },
            groundingMetadata: { groundingChunks: [], webSearchQueries: [] },
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  try {
    await fn();
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) {
      Deno.env.delete('GEMINI_API_KEY');
    } else {
      Deno.env.set('GEMINI_API_KEY', savedKey);
    }
  }
}

function makeRequest(
  body: unknown,
  headers?: Record<string, string>
): Request {
  return new Request('http://localhost/gemini-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// --- Rate Limiter Tests ---

Deno.test('checkRateLimit: allows up to RATE_LIMIT_MAX requests', () => {
  rateLimitMap.clear();
  const ip = 'test-ip-allow';
  for (let i = 0; i < 5; i++) {
    assertEquals(checkRateLimit(ip), true, `request ${i + 1} should be allowed`);
  }
  assertEquals(checkRateLimit(ip), false, 'request 6 should be denied');
});

Deno.test('handler: x-forwarded-for fallback when cf-connecting-ip absent', async () => {
  rateLimitMap.clear();
  await withStubs(async () => {
    // With x-forwarded-for but no cf-connecting-ip, requests use x-forwarded-for IP
    const ip = '10.0.0.1';
    for (let i = 0; i < 5; i++) {
      const req = makeRequest({ query: 'test' }, { 'x-forwarded-for': `${ip}, proxy1` });
      const res = await handler(req);
      assertEquals(res.status, 200, `request ${i + 1} should succeed`);
    }
    // 6th request from same x-forwarded-for IP should be rate limited
    const req6 = makeRequest({ query: 'test' }, { 'x-forwarded-for': `${ip}, proxy1` });
    const res6 = await handler(req6);
    assertEquals(res6.status, 429, '6th request from same x-forwarded-for IP should be 429');

    // Different x-forwarded-for IP should still succeed
    const reqOther = makeRequest({ query: 'test' }, { 'x-forwarded-for': '10.0.0.2, proxy1' });
    const resOther = await handler(reqOther);
    assertEquals(resOther.status, 200, 'different x-forwarded-for IP should succeed');
  });
});

Deno.test('handler: no IP headers → unknown shared bucket', async () => {
  rateLimitMap.clear();
  await withStubs(async () => {
    // Without any IP header, all requests share the 'unknown' bucket
    for (let i = 0; i < 5; i++) {
      const req = makeRequest({ query: 'test' });
      const res = await handler(req);
      assertEquals(res.status, 200, `request ${i + 1} should succeed`);
    }
    // 6th request should be rate limited (shared bucket)
    const req6 = makeRequest({ query: 'test' });
    const res6 = await handler(req6);
    assertEquals(res6.status, 429, '6th request without any IP header should be 429');
  });
});

Deno.test('handler: cf-connecting-ip takes priority over x-forwarded-for', async () => {
  rateLimitMap.clear();
  await withStubs(async () => {
    const cfIp = '192.168.1.1';
    const xffIp = '10.0.0.99';
    // Send 5 requests with both headers — rate limit should track cf-connecting-ip
    for (let i = 0; i < 5; i++) {
      const req = makeRequest(
        { query: 'test' },
        { 'cf-connecting-ip': cfIp, 'x-forwarded-for': xffIp }
      );
      const res = await handler(req);
      assertEquals(res.status, 200, `request ${i + 1} should succeed`);
    }
    // 6th request with same cf-connecting-ip should be rate limited
    const req6 = makeRequest(
      { query: 'test' },
      { 'cf-connecting-ip': cfIp, 'x-forwarded-for': xffIp }
    );
    const res6 = await handler(req6);
    assertEquals(res6.status, 429, 'should be rate limited by cf-connecting-ip');

    // Request with different cf-connecting-ip but same x-forwarded-for should succeed
    const reqDiffCf = makeRequest(
      { query: 'test' },
      { 'cf-connecting-ip': '192.168.1.2', 'x-forwarded-for': xffIp }
    );
    const resDiffCf = await handler(reqDiffCf);
    assertEquals(resDiffCf.status, 200, 'different cf-connecting-ip should succeed');
  });
});

Deno.test('checkRateLimit: MAX_TRACKED_IPS hard cap blocks new IPs', () => {
  rateLimitMap.clear();
  // Fill the map to MAX_TRACKED_IPS (10,000)
  for (let i = 0; i < 10_000; i++) {
    rateLimitMap.set(`ip-${i}`, { count: 1, resetAt: Date.now() + 60_000 });
  }
  assertEquals(rateLimitMap.size, 10_000);
  // New IP should be denied (fail-closed)
  assertEquals(checkRateLimit('new-ip'), false, 'new IP should be denied when at hard cap');
  // Existing IP should still be allowed
  assertEquals(checkRateLimit('ip-0'), true, 'existing IP should still be allowed');
  rateLimitMap.clear();
});

Deno.test('checkRateLimit: expired entries are pruned when map > 1000', () => {
  resetRateLimiter(); // Reset both map and lastCleanupAt timestamp
  const pastTime = Date.now() - 120_000; // 2 minutes ago
  for (let i = 0; i < 1500; i++) {
    rateLimitMap.set(`expired-${i}`, { count: 5, resetAt: pastTime });
  }
  assertEquals(rateLimitMap.size, 1500);
  // Next checkRateLimit triggers cleanup (lastCleanupAt was reset to 0)
  checkRateLimit('trigger-cleanup');
  // All expired entries should be removed, only the new one remains
  assertEquals(rateLimitMap.size, 1, 'expired entries should be pruned');
  resetRateLimiter();
});

Deno.test('checkRateLimit: cap reached with expired entries → forced cleanup frees space', () => {
  resetRateLimiter();
  // Set lastCleanupAt to NOW so the normal throttled cleanup (size>1000) is suppressed.
  // This forces checkRateLimit to hit the cap-specific forced cleanup path instead.
  setLastCleanupAtForTest(Date.now());
  const pastTime = Date.now() - 120_000; // expired
  // Fill 9999 expired + 1 active = 10000 total
  for (let i = 0; i < 9_999; i++) {
    rateLimitMap.set(`expired-ip-${i}`, { count: 1, resetAt: pastTime });
  }
  rateLimitMap.set('active-ip', { count: 1, resetAt: Date.now() + 60_000 });
  assertEquals(rateLimitMap.size, 10_000);
  // New IP should trigger forced cleanup at cap and be allowed (not false 429)
  assertEquals(checkRateLimit('brand-new-ip'), true, 'should allow after forced cleanup at cap');
  resetRateLimiter();
});

// --- withStubs Helper Tests ---

Deno.test('withStubs: restores pre-existing GEMINI_API_KEY', async () => {
  Deno.env.set('GEMINI_API_KEY', 'original-value');
  await withStubs(async () => {
    assertEquals(Deno.env.get('GEMINI_API_KEY'), 'test-key');
  });
  assertEquals(Deno.env.get('GEMINI_API_KEY'), 'original-value', 'should restore original key');
  Deno.env.delete('GEMINI_API_KEY');
});

Deno.test('withStubs: deletes GEMINI_API_KEY when it was absent', async () => {
  Deno.env.delete('GEMINI_API_KEY');
  await withStubs(async () => {
    assertEquals(Deno.env.get('GEMINI_API_KEY'), 'test-key');
  });
  assertEquals(Deno.env.get('GEMINI_API_KEY'), undefined, 'should be deleted after restore');
});

// --- Input Validation Tests ---

Deno.test('handler: malformed JSON returns 400', async () => {
  rateLimitMap.clear();
  const req = new Request('http://localhost/gemini-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cf-connecting-ip': '1.2.3.4',
    },
    body: 'not json at all',
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertStringIncludes(data.error, 'Invalid JSON');
});

Deno.test('handler: missing query returns 400', async () => {
  rateLimitMap.clear();
  const req = makeRequest({}, { 'cf-connecting-ip': '1.2.3.5' });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertStringIncludes(data.error, 'query is required');
});

Deno.test('handler: query exceeding max length returns 400', async () => {
  rateLimitMap.clear();
  const longQuery = 'a'.repeat(501);
  const req = makeRequest({ query: longQuery }, { 'cf-connecting-ip': '1.2.3.6' });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertStringIncludes(data.error, '500 characters');
});

// --- Model Validation Tests ---

Deno.test('handler: invalid model falls back to FLASH in response', async () => {
  rateLimitMap.clear();
  await withStubs(async () => {
    const req = makeRequest(
      { query: 'テスト資材', model: '__proto__' },
      { 'cf-connecting-ip': '1.2.3.7' }
    );
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.model, 'FLASH', 'invalid model should resolve to FLASH');
  });
});

Deno.test('handler: valid PRO model is preserved in response', async () => {
  rateLimitMap.clear();
  await withStubs(async () => {
    const req = makeRequest(
      { query: 'テスト資材', model: 'PRO' },
      { 'cf-connecting-ip': '1.2.3.8' }
    );
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.model, 'PRO', 'valid PRO model should be preserved');
  });
});

// --- API Key Transmission Tests ---

Deno.test('handler: sends x-goog-api-key header, not key query param', async () => {
  rateLimitMap.clear();
  const savedKey = Deno.env.get('GEMINI_API_KEY');
  const savedFetch = globalThis.fetch;
  Deno.env.set('GEMINI_API_KEY', 'test-key');

  let capturedUrl = '';
  let capturedHeaders: Headers | undefined;
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = typeof input === 'string' ? input : input.toString();
    capturedHeaders = new Headers(init?.headers);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{
            content: { parts: [{ text: '```json\n{"items":[],"summary":"ok"}\n```' }] },
            groundingMetadata: { groundingChunks: [], webSearchQueries: [] },
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  };

  try {
    const req = makeRequest({ query: 'テスト' }, { 'cf-connecting-ip': '1.2.3.20' });
    const res = await handler(req);
    assertEquals(res.status, 200);

    // API key must be in header, not URL
    assertEquals(capturedHeaders?.get('x-goog-api-key'), 'test-key', 'API key should be in header');
    assertEquals(capturedUrl.includes('key='), false, 'URL should not contain key= query param');
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) {
      Deno.env.delete('GEMINI_API_KEY');
    } else {
      Deno.env.set('GEMINI_API_KEY', savedKey);
    }
  }
});

// --- CORS Tests ---

Deno.test('handler: OPTIONS returns 204 with CORS headers', async () => {
  const req = new Request('http://localhost/gemini-search', {
    method: 'OPTIONS',
  });
  const res = await handler(req);
  assertEquals(res.status, 204);
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('handler: GET returns 405', async () => {
  const req = new Request('http://localhost/gemini-search', {
    method: 'GET',
  });
  const res = await handler(req);
  assertEquals(res.status, 405);
});

// --- Timeout Tests ---

Deno.test('handler: fetch AbortError returns 504', async () => {
  rateLimitMap.clear();
  const savedKey = Deno.env.get('GEMINI_API_KEY');
  const savedFetch = globalThis.fetch;
  Deno.env.set('GEMINI_API_KEY', 'test-key');

  globalThis.fetch = () => {
    const err = new DOMException('The operation was aborted', 'AbortError');
    return Promise.reject(err);
  };

  try {
    const req = makeRequest({ query: 'テスト' }, { 'cf-connecting-ip': '1.2.3.30' });
    const res = await handler(req);
    assertEquals(res.status, 504, 'AbortError should return 504');
    const data = await res.json();
    assertStringIncludes(data.error, 'timeout');
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) {
      Deno.env.delete('GEMINI_API_KEY');
    } else {
      Deno.env.set('GEMINI_API_KEY', savedKey);
    }
  }
});

// --- Retry-After Header Tests ---

Deno.test('handler: rate limit 429 includes Retry-After header', async () => {
  rateLimitMap.clear();
  await withStubs(async () => {
    const ip = '1.2.3.40';
    // Exhaust rate limit (5 requests)
    for (let i = 0; i < 5; i++) {
      const req = makeRequest({ query: 'テスト' }, { 'cf-connecting-ip': ip });
      await handler(req);
    }
    // 6th request should be 429 with Retry-After
    const req = makeRequest({ query: 'テスト' }, { 'cf-connecting-ip': ip });
    const res = await handler(req);
    assertEquals(res.status, 429);
    assertEquals(res.headers.get('Retry-After'), '60', '429 should include Retry-After: 60');
  });
});

// --- Multi-part Text Tests ---

Deno.test('handler: multi-part Gemini response text is concatenated', async () => {
  rateLimitMap.clear();
  const savedKey = Deno.env.get('GEMINI_API_KEY');
  const savedFetch = globalThis.fetch;
  Deno.env.set('GEMINI_API_KEY', 'test-key');

  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{
            content: {
              parts: [
                { text: '```json\n{"items":[],' },
                { text: '"summary":"part1 part2"}\n```' },
              ],
            },
            groundingMetadata: { groundingChunks: [], webSearchQueries: [] },
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

  try {
    const req = makeRequest({ query: 'テスト' }, { 'cf-connecting-ip': '1.2.3.50' });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const data = await res.json();
    assertStringIncludes(data.text, 'part1 part2', 'multi-part text should be concatenated');
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) {
      Deno.env.delete('GEMINI_API_KEY');
    } else {
      Deno.env.set('GEMINI_API_KEY', savedKey);
    }
  }
});
