/**
 * Block placement pure helpers (unit-testable).
 *
 * v1.0.2 では BlockPlacementModal の pure logic 抽出として作られた経緯があり、
 * ファイル名と path には Modal の名残が残る。v1.0.3 では Modal 廃止後、
 * BlockPlacementInlineControls (preview 画面 inline UI) と preview.tsx の
 * share workflow が同じ helper を共有する。
 *
 * React component (JSX) は node 環境の jest で直接 import できないため、pure
 * logic はここに集約してテスト容易性を確保する (TemplatePickerModal などと
 * 同じスタンス)。
 */

import type {
  DocumentWithTotals,
  SensitiveIssuerSnapshot,
} from '@/types/document';
import type { BlockKind, BlockPlacements, BlockPosition } from '@/types/blockPlacement';
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
 * Resolve the freshest `blockPlacements` for preview navigation (v1.0.3).
 *
 * Edit 画面が `previewData` 経由で preview に navigate する直前に呼ぶ。
 * 直近の preview セッションで inline UI が `updateDocument` で永続保存した
 * 値を AsyncStorage から読み戻して previewData に積む。
 *
 * 用途: edit 画面の `state.blockPlacements` は preview の inline UI 更新を
 * 受けないため、再 preview で stale 値が再注入される問題を防ぐ
 * (codex iter1 blocking #2 反映)。
 *
 * tri-state semantics:
 *   - documentId === null → 新規未保存書類、fallback (= state 値) を返す
 *   - documentId set + getDocument 成功 → fresh.data.blockPlacements を返す
 *   - documentId set + getDocument 失敗 → fallback を返す (defensive)
 *   - documentId set + data 不在 → fallback を返す
 */
export interface ResolveFreshBlockPlacementsDeps {
  getDocument: (id: string) => Promise<{
    success: boolean;
    data?: { blockPlacements: BlockPlacements | null } | null;
  }>;
}

export async function resolveFreshBlockPlacements(
  documentId: string | null,
  fallback: BlockPlacements | null,
  deps: ResolveFreshBlockPlacementsDeps
): Promise<BlockPlacements | null> {
  if (!documentId) return fallback;
  const result = await deps.getDocument(documentId);
  if (result.success && result.data) {
    return result.data.blockPlacements;
  }
  return fallback;
}

/**
 * Build updated placements for a single-block change (v1.0.3 inline UI).
 *
 * 既存 override (currentPlacements) を保持しつつ kind 1 つだけ position に書き換え。
 * `mergeBlockPlacements` (documentService 側) と同じセマンティクス: 他ブロックの
 * override は維持され、変更しない kind は省略しない (UI 操作の冪等性確保)。
 */
export function buildUpdatedPlacements(
  current: BlockPlacements | null,
  kind: BlockKind,
  position: BlockPosition
): BlockPlacements {
  return {
    ...(current ?? {}),
    [kind]: position,
  };
}

/**
 * Apply placement update via updateDocument (v1.0.3 inline UI).
 *
 * preview 画面の inline UI が tap ごとに呼ぶ async helper。
 * deps injection (updateDocument) で unit-testable に。
 *
 * tri-state semantics:
 *   - placements === null   → 「最初の配置に戻す」(全ブロック default 復帰)
 *   - placements === object → 1 ブロック以上の override (mergeBlockPlacements で merge)
 *
 * 失敗パスは success:false + errorMessage で返却。caller (component) が
 * Alert / 視覚エラー表示を担当。例外は throw せず受け取って message に変換。
 */
export interface ApplyPlacementUpdateArgs {
  documentId: string;
  placements: BlockPlacements | null;
}

export interface UpdateDocumentResultLike {
  success: boolean;
  error?: { message?: string };
}

export interface ApplyPlacementUpdateDeps {
  updateDocument: (
    id: string,
    input: { blockPlacements: BlockPlacements | null }
  ) => Promise<UpdateDocumentResultLike>;
}

export type ApplyPlacementUpdateResult =
  | { success: true; placements: BlockPlacements | null }
  | { success: false; errorMessage: string };

export async function applyPlacementUpdate(
  args: ApplyPlacementUpdateArgs,
  deps: ApplyPlacementUpdateDeps
): Promise<ApplyPlacementUpdateResult> {
  try {
    const result = await deps.updateDocument(args.documentId, {
      blockPlacements: args.placements,
    });
    if (!result.success) {
      return {
        success: false,
        errorMessage: result.error?.message ?? '保存に失敗しました',
      };
    }
    return { success: true, placements: args.placements };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : '保存に失敗しました',
    };
  }
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
