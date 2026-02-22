/**
 * Tests for daily usage limiter.
 * Run with: deno test --allow-env supabase/functions/_shared/dailyLimit_test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createDailyLimiter, getUtcDateKey } from './dailyLimit.ts';

Deno.test('getUtcDateKey: returns YYYY-MM-DD format', () => {
  assertEquals(getUtcDateKey(new Date('2026-02-22T15:30:00Z')), '2026-02-22');
  assertEquals(getUtcDateKey(new Date('2026-12-31T23:59:59Z')), '2026-12-31');
  assertEquals(getUtcDateKey(new Date('2026-01-01T00:00:00Z')), '2026-01-01');
});

Deno.test('dailyLimiter: allows requests within daily limit', () => {
  const limiter = createDailyLimiter({ maxPerDay: 3, maxTrackedUsers: 100 });
  assertEquals(limiter.checkAndIncrement('user-1'), true);
  assertEquals(limiter.checkAndIncrement('user-1'), true);
  assertEquals(limiter.checkAndIncrement('user-1'), true);
  assertEquals(limiter.getUsage('user-1'), 3);
});

Deno.test('dailyLimiter: blocks requests exceeding daily limit', () => {
  const limiter = createDailyLimiter({ maxPerDay: 3, maxTrackedUsers: 100 });
  for (let i = 0; i < 3; i++) limiter.checkAndIncrement('user-1');
  assertEquals(limiter.checkAndIncrement('user-1'), false, 'should block after limit');
  assertEquals(limiter.getUsage('user-1'), 3, 'count should not exceed limit');
});

Deno.test('dailyLimiter: different users have independent limits', () => {
  const limiter = createDailyLimiter({ maxPerDay: 2, maxTrackedUsers: 100 });
  limiter.checkAndIncrement('user-A');
  limiter.checkAndIncrement('user-A');
  assertEquals(limiter.checkAndIncrement('user-A'), false, 'user-A should be blocked');
  assertEquals(limiter.checkAndIncrement('user-B'), true, 'user-B should still be allowed');
  assertEquals(limiter.getUsage('user-B'), 1);
});

Deno.test('dailyLimiter: resets on new UTC day', () => {
  let fakeDate = new Date('2026-02-22T23:59:00Z');
  const limiter = createDailyLimiter(
    { maxPerDay: 1, maxTrackedUsers: 100 },
    () => fakeDate
  );
  assertEquals(limiter.checkAndIncrement('user-1'), true);
  assertEquals(limiter.checkAndIncrement('user-1'), false, 'blocked same day');

  fakeDate = new Date('2026-02-23T00:01:00Z'); // next day
  assertEquals(limiter.checkAndIncrement('user-1'), true, 'allowed on new day');
  assertEquals(limiter.getUsage('user-1'), 1, 'count reset to 1 on new day');
});

Deno.test('dailyLimiter: maxTrackedUsers fail-closed when all active today', () => {
  const limiter = createDailyLimiter({ maxPerDay: 10, maxTrackedUsers: 3 });
  limiter.checkAndIncrement('u1');
  limiter.checkAndIncrement('u2');
  limiter.checkAndIncrement('u3');
  assertEquals(limiter.size(), 3);
  assertEquals(limiter.checkAndIncrement('u4'), false, 'fail-closed at capacity');
});

Deno.test('dailyLimiter: maxTrackedUsers prunes stale entries', () => {
  let fakeDate = new Date('2026-02-22T12:00:00Z');
  const limiter = createDailyLimiter(
    { maxPerDay: 10, maxTrackedUsers: 3 },
    () => fakeDate
  );
  limiter.checkAndIncrement('old-1');
  limiter.checkAndIncrement('old-2');
  limiter.checkAndIncrement('old-3');
  assertEquals(limiter.size(), 3);

  // Move to next day — old entries become stale
  fakeDate = new Date('2026-02-23T12:00:00Z');
  assertEquals(limiter.checkAndIncrement('new-user'), true, 'should prune stale and allow');
});

Deno.test('dailyLimiter: reset clears all state', () => {
  const limiter = createDailyLimiter({ maxPerDay: 1, maxTrackedUsers: 100 });
  limiter.checkAndIncrement('user-1');
  limiter.reset();
  assertEquals(limiter.getUsage('user-1'), 0);
  assertEquals(limiter.size(), 0);
});

Deno.test('dailyLimiter: getUsage returns 0 for unknown user', () => {
  const limiter = createDailyLimiter({ maxPerDay: 10, maxTrackedUsers: 100 });
  assertEquals(limiter.getUsage('nonexistent'), 0);
});
