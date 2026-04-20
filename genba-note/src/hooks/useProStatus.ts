/**
 * useProStatus Hook (post-M1 stub)
 *
 * PIVOT_PLAN_v2.md §M1 で Pro tier は廃止された。RevenueCat 経由の
 * 課金判定は無くなったため、この hook は常に「Pro 相当」の定数を返す
 * stub として実装される。呼び出し元 UI は段階的に撤去予定だが、撤去が
 * 完了するまで Pro ガードが全て「許可」で通過することを保証する。
 *
 * Note: この hook 自体および呼び出し元の Pro 参照は、M1 の後続コミットで
 * 完全に削除される。撤去までのつなぎとして副作用なしで Pro 固定値を返す。
 */

export interface UseProStatusReturn {
  /** Whether the user has Pro access — always true post-M1 */
  isPro: boolean;
  /** Whether the status is being loaded — always false (no async work) */
  isLoading: boolean;
  /** User-friendly error/status message — always null (no gate) */
  message: string | null;
  /** The raw Pro gate reason — always null (no reasoning needed) */
  reason: null;
  /** Whether online verification is required — always false */
  requiresOnlineVerification: boolean;
  /** Refresh the Pro status — no-op that resolves immediately */
  refresh: () => Promise<void>;
}

const STUB_RESULT: UseProStatusReturn = {
  isPro: true,
  isLoading: false,
  message: null,
  reason: null,
  requiresOnlineVerification: false,
  refresh: () => Promise.resolve(),
};

export function useProStatus(): UseProStatusReturn {
  return STUB_RESULT;
}
