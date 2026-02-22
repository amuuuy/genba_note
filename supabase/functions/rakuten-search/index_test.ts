/**
 * Tests for rakuten-search Edge Function
 *
 * Verifies rate limiting (including Map growth protection),
 * input validation, error sanitization, auth, and no CORS headers.
 * Run with: deno test --allow-env --allow-net supabase/functions/rakuten-search/index_test.ts
 */

import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  handler,
  checkRateLimit,
  rateLimitMap,
  resetRateLimiter,
  setLastCleanupAtForTest,
  resetDailyLimiter,
} from './index.ts';
import { createFakeJwt, createAnonKeyJwt, createUserJwt } from '../_shared/test_helpers.ts';

// --- Helpers ---

/** Save and restore RAKUTEN_APP_ID + globalThis.fetch around a test body. */
async function withStubs(
  fn: () => Promise<void> | void,
): Promise<void> {
  const savedKey = Deno.env.get('RAKUTEN_APP_ID');
  const savedFetch = globalThis.fetch;
  Deno.env.set('RAKUTEN_APP_ID', 'test-app-id');
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ Items: [], hits: 0, page: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
  try {
    await fn();
  } finally {
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) {
      Deno.env.delete('RAKUTEN_APP_ID');
    } else {
      Deno.env.set('RAKUTEN_APP_ID', savedKey);
    }
  }
}

function makeRequest(
  body: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request('http://localhost/rakuten-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${createUserJwt()}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// --- Rate Limiter Tests ---

Deno.test('checkRateLimit: allows up to RATE_LIMIT_MAX (10) requests', () => {
  resetRateLimiter();
  const ip = 'test-ip-allow';
  for (let i = 0; i < 10; i++) {
    assertEquals(checkRateLimit(ip), true, `request ${i + 1} should be allowed`);
  }
  assertEquals(checkRateLimit(ip), false, 'request 11 should be denied');
});

Deno.test('checkRateLimit: MAX_TRACKED_IPS hard cap blocks new IPs', () => {
  resetRateLimiter();
  for (let i = 0; i < 10_000; i++) {
    rateLimitMap.set(`ip-${i}`, { count: 1, resetAt: Date.now() + 60_000 });
  }
  assertEquals(rateLimitMap.size, 10_000);
  assertEquals(checkRateLimit('new-ip'), false, 'new IP should be denied at hard cap');
  assertEquals(checkRateLimit('ip-0'), true, 'existing IP should still be allowed');
  resetRateLimiter();
});

Deno.test('checkRateLimit: expired entries pruned when map > 1000', () => {
  resetRateLimiter();
  const pastTime = Date.now() - 120_000;
  for (let i = 0; i < 1500; i++) {
    rateLimitMap.set(`expired-${i}`, { count: 10, resetAt: pastTime });
  }
  assertEquals(rateLimitMap.size, 1500);
  checkRateLimit('trigger-cleanup');
  assertEquals(rateLimitMap.size, 1, 'expired entries should be pruned');
  resetRateLimiter();
});

Deno.test('checkRateLimit: cap reached with expired entries → cleanup frees space for new IP', () => {
  resetRateLimiter();
  // lastCleanupAt past throttle interval — allows both normal and cap cleanup paths
  setLastCleanupAtForTest(Date.now() - 11_000);
  const pastTime = Date.now() - 120_000;
  for (let i = 0; i < 9_999; i++) {
    rateLimitMap.set(`expired-ip-${i}`, { count: 1, resetAt: pastTime });
  }
  rateLimitMap.set('active-ip', { count: 1, resetAt: Date.now() + 60_000 });
  assertEquals(rateLimitMap.size, 10_000);
  assertEquals(checkRateLimit('brand-new-ip'), true, 'should allow after forced cleanup at cap');
  resetRateLimiter();
});

Deno.test('checkRateLimit: cap reached with recent cleanup → immediate 429 (no repeated O(n) scan)', () => {
  resetRateLimiter();
  // Fill with active (non-expired) entries to hit cap
  for (let i = 0; i < 10_000; i++) {
    rateLimitMap.set(`ip-${i}`, { count: 1, resetAt: Date.now() + 60_000 });
  }
  // Set lastCleanupAt to NOW — cleanup was just done
  setLastCleanupAtForTest(Date.now());
  // New IP should be immediately denied without re-scanning the entire map
  assertEquals(checkRateLimit('attacker-ip-1'), false, '1st new IP denied');
  assertEquals(checkRateLimit('attacker-ip-2'), false, '2nd new IP denied');
  assertEquals(checkRateLimit('attacker-ip-3'), false, '3rd new IP denied');
  resetRateLimiter();
});

// --- IP Priority Tests ---

Deno.test('handler: cf-connecting-ip takes priority over x-forwarded-for', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const cfIp = '192.168.1.1';
    const xffIp = '10.0.0.99';
    // Send 10 requests with both headers — rate limit should track cf-connecting-ip
    for (let i = 0; i < 10; i++) {
      const req = makeRequest(
        { keyword: 'test' },
        { 'cf-connecting-ip': cfIp, 'x-forwarded-for': xffIp }
      );
      const res = await handler(req);
      assertEquals(res.status, 200, `request ${i + 1} should succeed`);
    }
    // 11th from same cf-connecting-ip → 429
    const req11 = makeRequest(
      { keyword: 'test' },
      { 'cf-connecting-ip': cfIp, 'x-forwarded-for': xffIp }
    );
    assertEquals((await handler(req11)).status, 429, 'should be rate limited by cf-connecting-ip');

    // Different cf-connecting-ip but same x-forwarded-for → 200
    const reqOther = makeRequest(
      { keyword: 'test' },
      { 'cf-connecting-ip': '192.168.1.2', 'x-forwarded-for': xffIp }
    );
    assertEquals((await handler(reqOther)).status, 200, 'different cf-connecting-ip should succeed');
  });
});

// --- Handler Tests ---

Deno.test('handler: POST with valid keyword returns 200', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = makeRequest({ keyword: 'テスト' }, { 'x-forwarded-for': '1.2.3.1' });
    const res = await handler(req);
    assertEquals(res.status, 200);
  });
});

Deno.test('handler: missing keyword returns 400', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = makeRequest({}, { 'x-forwarded-for': '1.2.3.2' });
    const res = await handler(req);
    assertEquals(res.status, 400);
    const data = await res.json();
    assertStringIncludes(data.error, 'keyword is required');
  });
});

Deno.test('handler: GET returns 405', async () => {
  const req = new Request('http://localhost/rakuten-search', { method: 'GET' });
  const res = await handler(req);
  assertEquals(res.status, 405);
});

Deno.test('handler: OPTIONS returns 405 (no CORS)', async () => {
  const req = new Request('http://localhost/rakuten-search', { method: 'OPTIONS' });
  const res = await handler(req);
  assertEquals(res.status, 405);
});

Deno.test('handler: POST response does not include CORS headers', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = makeRequest({ keyword: 'test' }, { 'x-forwarded-for': '1.2.3.98' });
    const res = await handler(req);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), null, 'should not have CORS header');
  });
});

Deno.test('handler: rate limit returns 429', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const ip = '1.2.3.50';
    for (let i = 0; i < 10; i++) {
      const req = makeRequest({ keyword: 'test' }, { 'x-forwarded-for': ip });
      await handler(req);
    }
    const req = makeRequest({ keyword: 'test' }, { 'x-forwarded-for': ip });
    const res = await handler(req);
    assertEquals(res.status, 429);
  });
});

Deno.test('handler: NaN page/hits returns 400', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = makeRequest(
      { keyword: 'test', page: 'abc', hits: NaN },
      { 'x-forwarded-for': '1.2.3.60' },
    );
    const res = await handler(req);
    assertEquals(res.status, 400);
    const data = await res.json();
    assertStringIncludes(data.error, 'valid numbers');
  });
});

Deno.test('handler: error returns 500 and log does not leak RAKUTEN_APP_ID', async () => {
  resetRateLimiter();
  const savedKey = Deno.env.get('RAKUTEN_APP_ID');
  const appId = 'secret-rakuten-key-12345';
  Deno.env.set('RAKUTEN_APP_ID', appId);
  const savedFetch = globalThis.fetch;
  // Simulate fetch failure whose message contains the URL (with applicationId)
  globalThis.fetch = () =>
    Promise.reject(new Error(`request to https://api.rakuten.co.jp?applicationId=${appId}&keyword=test failed`));

  const savedConsoleError = console.error;
  const loggedArgs: unknown[] = [];
  console.error = (...args: unknown[]) => { loggedArgs.push(...args); };

  try {
    const req = makeRequest({ keyword: 'test' }, { 'x-forwarded-for': '1.2.3.70' });
    const res = await handler(req);
    assertEquals(res.status, 500);
    const data = await res.json();
    assertEquals(data.error, 'Internal server error');
    // Verify that the logged output does not contain the API key
    const logStr = loggedArgs.join(' ');
    assertEquals(logStr.includes(appId), false, `log must not contain RAKUTEN_APP_ID: ${logStr}`);
  } finally {
    console.error = savedConsoleError;
    globalThis.fetch = savedFetch;
    if (savedKey === undefined) {
      Deno.env.delete('RAKUTEN_APP_ID');
    } else {
      Deno.env.set('RAKUTEN_APP_ID', savedKey);
    }
  }
});

Deno.test('handler: missing RAKUTEN_APP_ID returns 500', async () => {
  resetRateLimiter();
  const savedKey = Deno.env.get('RAKUTEN_APP_ID');
  Deno.env.delete('RAKUTEN_APP_ID');

  try {
    const req = makeRequest({ keyword: 'test' }, { 'x-forwarded-for': '1.2.3.80' });
    const res = await handler(req);
    assertEquals(res.status, 500);
    const data = await res.json();
    assertStringIncludes(data.error, 'Server configuration error');
  } finally {
    if (savedKey !== undefined) {
      Deno.env.set('RAKUTEN_APP_ID', savedKey);
    }
  }
});

// --- Auth Tests ---

Deno.test('handler: anon key JWT returns 401', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = makeRequest(
      { keyword: 'test' },
      { 'Authorization': `Bearer ${createAnonKeyJwt()}`, 'x-forwarded-for': '1.2.3.100' }
    );
    const res = await handler(req);
    assertEquals(res.status, 401);
    const data = await res.json();
    assertStringIncludes(data.error.toLowerCase(), 'unauthorized');
  });
});

Deno.test('handler: user JWT with role=authenticated returns 200', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = makeRequest(
      { keyword: 'test' },
      { 'Authorization': `Bearer ${createUserJwt()}`, 'x-forwarded-for': '1.2.3.101' }
    );
    const res = await handler(req);
    assertEquals(res.status, 200);
  });
});

Deno.test('handler: missing Authorization header returns 401', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = new Request('http://localhost/rakuten-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.102' },
      body: JSON.stringify({ keyword: 'test' }),
    });
    const res = await handler(req);
    assertEquals(res.status, 401);
  });
});

Deno.test('handler: malformed JWT returns 401', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const req = makeRequest(
      { keyword: 'test' },
      { 'Authorization': 'Bearer not.valid.jwt', 'x-forwarded-for': '1.2.3.103' }
    );
    const res = await handler(req);
    assertEquals(res.status, 401);
  });
});

Deno.test('handler: JWT without sub returns 401', async () => {
  resetRateLimiter();
  await withStubs(async () => {
    const token = createFakeJwt({ role: 'authenticated' }); // no sub
    const req = makeRequest(
      { keyword: 'test' },
      { 'Authorization': `Bearer ${token}`, 'x-forwarded-for': '1.2.3.104' }
    );
    const res = await handler(req);
    assertEquals(res.status, 401);
  });
});

// --- Daily Limit Tests ---

Deno.test('handler: user at daily limit gets 429 daily_limit_exceeded', async () => {
  resetRateLimiter();
  resetDailyLimiter();
  await withStubs(async () => {
    const userId = 'daily-exhaust-user';
    const token = createUserJwt(userId);
    // Exhaust 100 daily requests (reset per-minute IP limit every 10 requests)
    for (let i = 0; i < 100; i++) {
      if (i % 10 === 0) resetRateLimiter();
      const req = makeRequest(
        { keyword: 'test' },
        { 'Authorization': `Bearer ${token}`, 'cf-connecting-ip': `10.${Math.floor(i / 256)}.${i % 256}.1` }
      );
      const res = await handler(req);
      assertEquals(res.status, 200, `req ${i + 1} should succeed`);
    }
    // 101st should be daily_limit_exceeded
    resetRateLimiter();
    const req101 = makeRequest(
      { keyword: 'test' },
      { 'Authorization': `Bearer ${token}`, 'cf-connecting-ip': '10.99.0.1' }
    );
    const res101 = await handler(req101);
    assertEquals(res101.status, 429);
    const data = await res101.json();
    assertEquals(data.error, 'daily_limit_exceeded');
  });
  resetDailyLimiter();
});

Deno.test('handler: per-minute 429 is distinct from daily 429', async () => {
  resetRateLimiter();
  resetDailyLimiter();
  await withStubs(async () => {
    const token = createUserJwt('rate-vs-daily');
    const ip = '10.200.0.1';
    for (let i = 0; i < 10; i++) {
      const req = makeRequest(
        { keyword: 'test' },
        { 'Authorization': `Bearer ${token}`, 'cf-connecting-ip': ip }
      );
      await handler(req);
    }
    // 11th same IP → per-minute rate limit (not daily)
    const req11 = makeRequest(
      { keyword: 'test' },
      { 'Authorization': `Bearer ${token}`, 'cf-connecting-ip': ip }
    );
    const res11 = await handler(req11);
    assertEquals(res11.status, 429);
    const data = await res11.json();
    assertStringIncludes(data.error, 'Rate limit', 'should be per-minute rate limit, not daily');
  });
  resetDailyLimiter();
});

Deno.test('handler: different users have independent daily limits', async () => {
  resetRateLimiter();
  resetDailyLimiter();
  await withStubs(async () => {
    const tokenA = createUserJwt('user-A-daily');
    const tokenB = createUserJwt('user-B-daily');
    // Exhaust user A's daily limit (100 requests)
    for (let i = 0; i < 100; i++) {
      if (i % 10 === 0) resetRateLimiter();
      const req = makeRequest(
        { keyword: 'test' },
        { 'Authorization': `Bearer ${tokenA}`, 'cf-connecting-ip': `10.${Math.floor(i / 256)}.${i % 256}.2` }
      );
      await handler(req);
    }
    // User A should be blocked
    resetRateLimiter();
    const reqA = makeRequest(
      { keyword: 'test' },
      { 'Authorization': `Bearer ${tokenA}`, 'cf-connecting-ip': '10.99.1.1' }
    );
    assertEquals((await handler(reqA)).status, 429);

    // User B should still be allowed
    const reqB = makeRequest(
      { keyword: 'test' },
      { 'Authorization': `Bearer ${tokenB}`, 'cf-connecting-ip': '10.99.2.1' }
    );
    assertEquals((await handler(reqB)).status, 200);
  });
  resetDailyLimiter();
});
