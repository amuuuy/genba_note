/**
 * Per-template default block placements (1px 不変保証の核).
 *
 * SPEC: SPEC_V1_0_2.md §5.2 — codex 6 テンプレ DOM 監査による確定値。
 * `blockPlacements: null` の既存書類が v1.0.1 と pixel diff = 0 でレンダされる
 * ことをデータレイヤで保証する。実装値の調整は §5.4 検証手順 (P1 ゲート) で行う。
 */

import type { BlockPlacements } from '@/types/blockPlacement';
import type { DocumentTemplateId } from '@/types/settings';

export const TEMPLATE_DEFAULT_BLOCK_PLACEMENTS: Record<
  DocumentTemplateId,
  Required<BlockPlacements>
> = {
  FORMAL_STANDARD: {
    bankAccount: 'top-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  },
  ACCOUNTING: {
    bankAccount: 'top-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  },
  SIMPLE: {
    bankAccount: 'top-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  },
  MODERN: {
    bankAccount: 'bottom-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  },
  CLASSIC: {
    bankAccount: 'top-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  },
  CONSTRUCTION: {
    bankAccount: 'bottom-center',
    companyStamp: 'top-right',
    remarks: 'bottom-center',
  },
};
