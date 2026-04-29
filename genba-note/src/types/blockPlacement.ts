/**
 * Block placement type definitions for v1.0.2 customizable block layout.
 *
 * SPEC: SPEC_V1_0_2.md §3.1 / §3.5
 *
 * 振込口座 / 印影 / 備考 の 3 ブロックを 6 マス + hidden の中から選択して
 * 書類単位で配置できるようにするための型基盤。
 */

export const BLOCK_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'hidden',
] as const;

export type BlockPosition = (typeof BLOCK_POSITIONS)[number];

export type BlockKind = 'bankAccount' | 'companyStamp' | 'remarks';

export type BlockPlacements = {
  bankAccount?: BlockPosition;
  companyStamp?: BlockPosition;
  remarks?: BlockPosition;
};

/**
 * Defensive fallback for unknown position strings.
 *
 * 将来テンプレ追加で position 列挙が拡張された場合、古いアプリで未知の
 * position を読むと例外を投げず fallback に倒す。SPEC §3.5。
 */
export function safePosition(
  p: string | undefined,
  fallback: BlockPosition
): BlockPosition {
  return (BLOCK_POSITIONS as readonly string[]).includes(p ?? '')
    ? (p as BlockPosition)
    : fallback;
}
