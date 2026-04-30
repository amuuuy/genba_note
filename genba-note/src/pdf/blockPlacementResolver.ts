/**
 * Block placement resolver — leaf module (SPEC §3.4).
 *
 * 純粋関数のみを export する leaf module。HTML 生成や template registration の
 * 副作用を一切持たないため、domain レイヤ (convertEstimateToInvoice 等) からも
 * 安全に import できる。
 *
 * preview / print 経路では `pdfTemplateService.generateHtmlTemplate()` 内で
 * 1 回だけ呼ばれる shared path 設計 (SPEC §3.4)。convert 経路は本 module から
 * 直接呼んで full resolve copy を行う (SPEC §3.3)。
 */

import type { DocumentTemplateId } from './types';
import { safePosition, type BlockPlacements } from '@/types/blockPlacement';
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from './blockPlacementDefaults';

/**
 * Check whether a resolved placement is identical to the template default.
 *
 * 各 generator が legacy/default branch (既存 DOM そのまま) と override/grid branch
 * (grid layout に切替) を分岐するために使う。SPEC §5.4 の pixel diff 0 を達成
 * するため、default 一致時は既存 DOM を 1 ピクセルも変えずに出力する。
 *
 * Codex P4-C 設計判断 hybrid pattern (B 寄り) の核心 helper。
 *
 * 重要: raw `blockPlacements` (null / partial) ではなく、必ず resolveBlockPlacements
 * を通した後の `Required<BlockPlacements>` で判定する。
 *   - null            → resolved が default と一致 → legacy branch
 *   - {bank: 'top-center'} (template default と同じ部分指定) → resolved が default と一致 → legacy branch
 *   - full default object (3 つ全部 default 値) → resolved が default と一致 → legacy branch
 *   - 一つでも違えば override → grid branch
 */
export function isDefaultResolvedPlacement(
  resolved: Required<BlockPlacements>,
  templateId: DocumentTemplateId
): boolean {
  const def = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[templateId];
  return (
    resolved.bankAccount === def.bankAccount &&
    resolved.companyStamp === def.companyStamp &&
    resolved.remarks === def.remarks
  );
}

/**
 * 書類保存値 (raw override) とテンプレ default をマージし、generator が
 * 直接使える `Required<BlockPlacements>` を返す純粋関数。
 *
 * - `null` / `undefined` override → 全 lazy default
 * - partial override → 設定済みフィールドのみ override、残りは default
 * - invalid enum → safePosition() で template default に倒す (SPEC §3.5)
 */
export function resolveBlockPlacements(
  raw: BlockPlacements | null | undefined,
  templateId: DocumentTemplateId
): Required<BlockPlacements> {
  const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS[templateId];
  const override = raw ?? {};
  return {
    bankAccount: safePosition(override.bankAccount, templateDefault.bankAccount),
    companyStamp: safePosition(override.companyStamp, templateDefault.companyStamp),
    remarks: safePosition(override.remarks, templateDefault.remarks),
  };
}
