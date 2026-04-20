/**
 * Tests for useProStatus Hook (post-M1 stub)
 *
 * PIVOT_PLAN_v2.md §M1 で Pro tier は廃止されたので、この hook は
 * 常に「Pro 扱い」の定数を返す stub として機能する。テストは hook が
 * 副作用なしで Pro 固定値を返すことを保証する。
 *
 * Note: hook 本体および呼び出し元は M1 の後続コミットで撤去予定。
 * 撤去までのつなぎとして安全な定数を返すことをこのテストが担保する。
 * stub は useState/useEffect を持たないため、test からは直接関数
 * 呼び出ししても React Hook のルール違反にはならない（副作用なし）。
 */

/* eslint-disable react-hooks/rules-of-hooks */

import { useProStatus } from '@/hooks/useProStatus';

describe('useProStatus (stubbed after M1 paywall teardown)', () => {
  it('returns Pro-equivalent constants', () => {
    const result = useProStatus();

    expect(result.isPro).toBe(true);
    expect(result.isLoading).toBe(false);
    expect(result.message).toBeNull();
    expect(result.reason).toBeNull();
    expect(result.requiresOnlineVerification).toBe(false);
    expect(typeof result.refresh).toBe('function');
  });

  it('exposes a no-op refresh that resolves without side effects', async () => {
    const result = useProStatus();
    await expect(result.refresh()).resolves.toBeUndefined();
  });
});
