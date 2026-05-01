/**
 * BlockPlacementModal pure helpers (unit-testable).
 *
 * BlockPlacementModal.tsx は React component (JSX) を含むため node 環境の jest では
 * 直接 import できない。pure logic はここに集約してテスト容易性を確保する
 * (TemplatePickerModal などと同じスタンス、Codex P5-C testing advisory 反映)。
 */

import type { BlockPlacements } from '@/types/blockPlacement';
import type { DocumentTemplateId } from '@/types/settings';
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from '@/pdf/blockPlacementDefaults';

/**
 * Resolve current placements with template default fallback for UI display.
 * `currentPlacements` が null/partial の場合、template default で穴埋めして
 * 詳細設定の「現在位置ハイライト」が一意に決まるようにする。
 *
 * 注意: 'hidden' は template default で上書きされず保持される (override 値が
 * 何であれ尊重)。
 */
export function resolvePlacementsForDisplay(
  current: BlockPlacements | null,
  templateId: DocumentTemplateId
): Required<BlockPlacements> {
  const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[templateId];
  const override = current ?? {};
  return {
    bankAccount: override.bankAccount ?? templateDefault.bankAccount,
    companyStamp: override.companyStamp ?? templateDefault.companyStamp,
    remarks: override.remarks ?? templateDefault.remarks,
  };
}
