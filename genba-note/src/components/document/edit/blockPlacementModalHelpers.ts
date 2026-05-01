/**
 * BlockPlacementModal pure helpers (unit-testable).
 *
 * BlockPlacementModal.tsx は React component (JSX) を含むため node 環境の jest では
 * 直接 import できない。pure logic はここに集約してテスト容易性を確保する
 * (TemplatePickerModal などと同じスタンス、Codex P5-C testing advisory 反映)。
 */

import type {
  DocumentWithTotals,
  SensitiveIssuerSnapshot,
} from '@/types/document';
import type { BlockPlacements } from '@/types/blockPlacement';
import type { DocumentTemplateId, PreviewOrientation } from '@/types/settings';
import type {
  PdfTemplateInput,
  PdfGenerationResult,
  PdfGenerationOptions,
} from '@/pdf/types';
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from '@/pdf/blockPlacementDefaults';

// 注意: `generateAndSharePdf` の実関数 import は避ける (expo-print / expo-sharing
// が node jest env で parse 不可)。caller が deps として注入する形に統一する。

export type GenerateAndSharePdfFn = (
  input: Omit<PdfTemplateInput, 'mode'>,
  options?: PdfGenerationOptions
) => Promise<PdfGenerationResult>;

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
 * Preview share workflow input args.
 *
 * preview 画面の handleFilenameConfirm が呼ぶ async helper の入力。
 * deps injection (generateAndSharePdf) で unit-testable に。
 */
export interface PerformPreviewShareConfirmArgs {
  document: DocumentWithTotals;
  blockPlacementsOverride: BlockPlacements | null | undefined;
  sensitiveSnapshot: SensitiveIssuerSnapshot | null;
  orientation: PreviewOrientation;
  customFilename: string;
}

export interface PerformPreviewShareConfirmDeps {
  generateAndSharePdf: GenerateAndSharePdfFn;
}

/**
 * preview 画面の PDF 共有経路 — share workflow 全体を pure async helper に集約。
 *
 * Codex P5-D iter3 blocking 反映: pure helper (applyEffectiveBlockPlacementsToDocument)
 * の test だけでは「caller が helper を呼んでいるか」を担保できなかった。本 helper を
 * preview.tsx の handleFilenameConfirm から唯一の経路として呼ぶことで、test で
 * generateAndSharePdf を mock して effective blockPlacements が PDF 入力に渡る
 * ことを直接検証可能にする。
 *
 * 配線責務:
 * 1. applyEffectiveBlockPlacementsToDocument で document を effective 値に上書き
 * 2. generateAndSharePdf に渡す (deps non-optional で必ず caller が指定)
 * 3. PdfGenerationResult を pass-through
 *
 * caller (preview.tsx) は本関数の戻り値で error 表示や isGenerating 状態を制御する。
 *
 * deps が non-optional な理由: 実関数 (`generateAndSharePdf`) を本 helper が import
 * すると expo-print / expo-sharing が node jest env で parse 不可になる。caller 側で
 * 実装を持つ責務分離 (preview.tsx は import + 渡し、test は mock + 渡し)。
 */
export async function performPreviewShareConfirm(
  args: PerformPreviewShareConfirmArgs,
  deps: PerformPreviewShareConfirmDeps
): Promise<PdfGenerationResult> {
  const documentForPdf = applyEffectiveBlockPlacementsToDocument(
    args.document,
    args.blockPlacementsOverride
  );
  return await deps.generateAndSharePdf(
    { document: documentForPdf, sensitiveSnapshot: args.sensitiveSnapshot },
    { orientation: args.orientation, customFilename: args.customFilename }
  );
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
