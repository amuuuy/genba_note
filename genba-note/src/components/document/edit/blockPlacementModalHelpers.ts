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

/**
 * Resolve effective blockPlacements for caller (preview screen, PDF generation 等).
 *
 * tri-state semantics (SPEC §3.3.1 と一致):
 *   - override === undefined: caller の override 不在、document の保存値を使う
 *   - override === null: caller が「最初の配置に戻す」を要求、null pass-through
 *   - override === BlockPlacements: caller の explicit 上書き値を採用
 *
 * preview/PDF parity (Codex P5-D iter1 blocking 反映):
 * preview 画面で modal 経由に override を更新したら、WebView だけでなく PDF
 * 出力にも同じ effective value を反映する必要がある (古い document.blockPlacements
 * を使うと preview と PDF の配置が乖離する)。本 helper を共通使用することで
 * 両経路の一致を保証する。
 */
export function resolveEffectiveBlockPlacements(
  override: BlockPlacements | null | undefined,
  documentValue: BlockPlacements | null
): BlockPlacements | null {
  return override !== undefined ? override : documentValue;
}

/**
 * Build a document copy with effective blockPlacements applied (preview/PDF parity).
 *
 * preview.tsx の PDF 共有経路で `generateAndSharePdf` に渡す document を
 * 組み立てる shared helper (Codex P5-D iter2 blocking 反映)。pure function 化
 * することで「caller が helper を実際に呼んでいるか」を回帰 test で検証可能にする
 * (pure helper 単体 test だけでは配線抜けを検出できなかった iter2 の学習)。
 *
 * 入力 document の他フィールドは破壊せず、blockPlacements のみ effective 値に
 * 上書きする。override === undefined なら document の値そのまま (no-op shallow copy)。
 */
export function applyEffectiveBlockPlacementsToDocument<
  T extends { blockPlacements: BlockPlacements | null }
>(doc: T, override: BlockPlacements | null | undefined): T {
  return {
    ...doc,
    blockPlacements: resolveEffectiveBlockPlacements(override, doc.blockPlacements),
  };
}
