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
