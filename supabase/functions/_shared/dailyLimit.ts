/**
 * Server-side daily usage limiter per user ID.
 *
 * In-memory Map pattern (consistent with IP rate limiter).
 * Resets on UTC day boundary.
 *
 * Trade-off: In-memory state resets on cold start / scale-out.
 * This is an intentional best-effort cap (consistent with the existing
 * per-IP rate limiter). True enforcement relies on verify_jwt gating
 * plus client-side Pro/Free checks. A future iteration may migrate to
 * a shared persistent store (Postgres/Redis) if abuse is observed.
 */

export interface DailyUsageEntry {
  count: number;
  dateKey: string; // "YYYY-MM-DD" UTC
}

export interface DailyLimitConfig {
  maxPerDay: number;
  maxTrackedUsers: number;
}

export function getUtcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function createDailyLimiter(
  config: DailyLimitConfig,
  nowFn: () => Date = () => new Date()
) {
  const { maxPerDay, maxTrackedUsers } = config;
  const usageMap = new Map<string, DailyUsageEntry>();

  function checkAndIncrement(userId: string): boolean {
    const today = getUtcDateKey(nowFn());

    // Prune stale entries (from previous days) if at capacity
    if (usageMap.size >= maxTrackedUsers && !usageMap.has(userId)) {
      for (const [key, entry] of usageMap) {
        if (entry.dateKey !== today) usageMap.delete(key);
      }
      if (usageMap.size >= maxTrackedUsers) return false; // fail-closed
    }

    const entry = usageMap.get(userId);
    if (!entry || entry.dateKey !== today) {
      usageMap.set(userId, { count: 1, dateKey: today });
      return true;
    }
    if (entry.count >= maxPerDay) return false;
    entry.count++;
    return true;
  }

  function getUsage(userId: string): number {
    const today = getUtcDateKey(nowFn());
    const entry = usageMap.get(userId);
    if (!entry || entry.dateKey !== today) return 0;
    return entry.count;
  }

  function reset(): void {
    usageMap.clear();
  }

  function size(): number {
    return usageMap.size;
  }

  return { checkAndIncrement, getUsage, reset, size };
}
