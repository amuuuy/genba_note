/**
 * useDocumentPreviewHtml — Shared rendering pipeline for document preview/PDF.
 *
 * SPEC: SPEC_V1_0_2.md §6.3 (hybrid hook 設計、Q1=C 反映)
 *
 * preview.tsx と P5 の BlockPlacementModal で共用される。両者で webViewHtml
 * を取って WebView の source prop に渡すだけで、HTML 生成・依存解決・WebView
 * 加工 (CSP/landscape) は本 hook が一手に引き受ける。
 *
 * 責務境界 (SPEC §6.3):
 * - hook 内: 書類読み込み、settings/issuer/background 解決、HTML 生成、CSP/orientation 加工
 * - 呼び出し側 (preview.tsx): TemplatePickerModal の visible state、共有実行 state、
 *   orientation 自体の state 管理 (orientation override は hook 入力)
 */

import { useEffect, useMemo, useState } from 'react';
import type {
  Document,
  DocumentType,
  DocumentWithTotals,
  SensitiveIssuerSnapshot,
} from '@/types/document';
import type {
  AppSettings,
  BackgroundDesign,
  DocumentTemplateId,
  PreviewOrientation,
  SealSize,
} from '@/types/settings';
import type { BlockPlacements } from '@/types/blockPlacement';
import type { PdfTemplateInput } from '@/pdf/types';
import { getDocument } from '@/domain/document';
import { getSettings } from '@/storage/asyncStorageService';
import { resolveIssuerInfo } from '@/pdf/issuerResolverService';
import { resolveBackgroundImageDataUrl } from '@/utils/imageUtils';
import { enrichDocumentWithTotals } from '@/domain/lineItem/calculationService';
import {
  generateHtmlTemplate,
  deriveDisplayHtml,
} from '@/pdf/pdfTemplateService';
import { injectCsp } from '@/utils/previewHtmlSecurity';
import { resolveTemplateForUser } from '@/constants/templateOptions';

// === Public Types ===

/**
 * Source for the document being previewed (SPEC §6.3 discriminated union).
 *
 * - documentId: 保存済み書類を id で読み込む (preview.tsx の通常経路)
 * - previewDocument: 未保存プレビュー (previewData URL params 由来) を直接渡す
 */
export type DocumentPreviewSource =
  | { kind: 'documentId'; documentId: string }
  | { kind: 'previewDocument'; document: Document };

export interface UseDocumentPreviewHtmlInput {
  source: DocumentPreviewSource;
  templateIdOverride?: DocumentTemplateId;
  blockPlacementsOverride?: BlockPlacements | null;
  sealSizeOverride?: SealSize;
  backgroundDesignOverride?: BackgroundDesign;
  backgroundImageDataUrlOverride?: string | null;
  orientation?: PreviewOrientation;
}

export interface UseDocumentPreviewHtmlReturn {
  /** WebView の source prop に渡す HTML (CSP/landscape 適用済み)。null = まだ準備中 or 失敗。 */
  webViewHtml: string | null;
  /**
   * CSP injection が成功したかどうか (defence-in-depth、fail-closed)。
   * caller は javaScriptEnabled / injectedJavaScript prop の有効化判定に使う。
   * webViewHtml が non-null でも CSP が当たっていない場合は false。
   */
  webViewCspApplied: boolean;
  /** 共有処理 (PDF 出力) で再利用するための DocumentWithTotals */
  resolvedDocumentWithTotals: DocumentWithTotals | null;
  /** 共有処理で再利用する sensitive snapshot */
  sensitiveSnapshot: SensitiveIssuerSnapshot | null;
  /**
   * 実際に HTML 生成に使われた template ID (UI 側で TemplatePicker の
   * currentTemplateId として表示する値)。null = まだ未解決。
   */
  resolvedTemplateId: DocumentTemplateId | null;
  /** 実際に HTML 生成に使われた sealSize (TemplatePicker の currentSealSize) */
  resolvedSealSize: SealSize | null;
  isLoading: boolean;
  error: Error | null;
}

// === Pure Helpers (exported for unit testing) ===

/**
 * settings + override から template ID を決定する純粋関数。
 *
 * - templateIdOverride が指定されていればそれを優先 (UI から picker で選択した場合)
 * - 未指定なら settings の defaultEstimateTemplateId / defaultInvoiceTemplateId
 * - settings が null なら type ベースの hardcoded fallback
 *
 * 注: settings.defaultEstimateTemplateId は asyncStorageService.getSettings() で
 * VALID_TEMPLATE_IDS により読込時に正規化済みなので registry に依存しない。
 */
export function resolveTemplateIdFromSettings(
  docType: DocumentType,
  settings: AppSettings | null,
  templateIdOverride: DocumentTemplateId | undefined
): DocumentTemplateId {
  if (templateIdOverride) {
    return templateIdOverride;
  }
  if (settings) {
    const raw =
      docType === 'estimate'
        ? settings.defaultEstimateTemplateId
        : settings.defaultInvoiceTemplateId;
    return resolveTemplateForUser(docType, raw) as DocumentTemplateId;
  }
  return docType === 'estimate' ? 'FORMAL_STANDARD' : 'ACCOUNTING';
}

/**
 * generateHtmlTemplate に渡す PdfTemplateInput を組み立てる純粋関数。
 *
 * preview / print / BlockPlacementModal で共通の入力 shape を作り、
 * generator 呼び出しを一元化する (SPEC §3.4 shared path)。
 */
export interface BuildPdfTemplateInputOptions {
  sealSize: SealSize;
  backgroundDesign: BackgroundDesign;
  backgroundImageDataUrl: string | null;
  blockPlacements: BlockPlacements | null;
}

export function buildPdfTemplateInput(
  documentWithTotals: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  templateId: DocumentTemplateId,
  options: BuildPdfTemplateInputOptions
): PdfTemplateInput {
  return {
    document: documentWithTotals,
    sensitiveSnapshot,
    mode: 'pdf',
    templateId,
    sealSize: options.sealSize,
    backgroundDesign: options.backgroundDesign,
    backgroundImageDataUrl: options.backgroundImageDataUrl,
    // P4 で generateHtmlTemplate 内 shared path に配線する。今は型を通すだけ。
    blockPlacements: options.blockPlacements,
  };
}

/**
 * WebView 表示用の HTML に加工する純粋関数。
 * - landscape の場合は @page CSS と viewport meta を inject
 * - CSP meta tag を inject (defence-in-depth)
 *
 * Returns:
 *   { html: null, cspApplied: false } when input is empty
 *   { html, cspApplied } where cspApplied=false signals fail-closed
 *     (caller should disable JavaScript in the WebView)
 */
export interface BuildWebViewHtmlResult {
  html: string | null;
  cspApplied: boolean;
}

export function buildWebViewHtml(
  rawHtml: string,
  orientation: PreviewOrientation
): BuildWebViewHtmlResult {
  if (!rawHtml) return { html: null, cspApplied: false };
  const oriented = deriveDisplayHtml(rawHtml, orientation);
  const csp = injectCsp(oriented);
  return { html: csp.html, cspApplied: csp.success };
}

// === Hook ===

/**
 * SPEC §6.3 hybrid hook。preview.tsx / BlockPlacementModal で共用する
 * shared rendering pipeline。
 */
export function useDocumentPreviewHtml(
  input: UseDocumentPreviewHtmlInput
): UseDocumentPreviewHtmlReturn {
  const {
    source,
    templateIdOverride,
    blockPlacementsOverride,
    sealSizeOverride,
    backgroundDesignOverride,
    backgroundImageDataUrlOverride,
    orientation = 'PORTRAIT',
  } = input;

  const [documentWithTotals, setDocumentWithTotals] = useState<DocumentWithTotals | null>(null);
  const [sensitiveSnapshot, setSensitiveSnapshot] = useState<SensitiveIssuerSnapshot | null>(null);
  const [resolvedTemplateId, setResolvedTemplateId] = useState<DocumentTemplateId | null>(null);
  const [resolvedSealSize, setResolvedSealSize] = useState<SealSize | undefined>(undefined);
  const [resolvedBackgroundDesign, setResolvedBackgroundDesign] = useState<BackgroundDesign | undefined>(undefined);
  const [resolvedBackgroundImageDataUrl, setResolvedBackgroundImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const sourceKey = source.kind === 'documentId' ? source.documentId : source.document.id;

  useEffect(() => {
    let stale = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Resolve raw Document
        let document: Document;
        if (source.kind === 'documentId') {
          const result = await getDocument(source.documentId);
          if (stale) return;
          if (!result.success || !result.data) {
            throw new Error('書類が見つかりません');
          }
          document = result.data;
        } else {
          document = source.document;
        }

        // 2. Enrich with totals
        const enriched = enrichDocumentWithTotals(document);

        // 3. Resolve issuer info
        const documentId = document.id || '';
        const issuerInfo = await resolveIssuerInfo(documentId, enriched.issuerSnapshot);
        if (stale) return;

        // 4. Settings + template/sealSize/background resolve
        const settingsResult = await getSettings();
        if (stale) return;
        const settings = settingsResult.success ? settingsResult.data ?? null : null;

        const templateId = resolveTemplateIdFromSettings(
          document.type,
          settings,
          templateIdOverride
        );
        const sealSize = sealSizeOverride ?? settings?.sealSize ?? 'MEDIUM';
        const backgroundDesign =
          backgroundDesignOverride ?? settings?.backgroundDesign ?? 'NONE';
        const backgroundImageDataUrl =
          backgroundImageDataUrlOverride !== undefined
            ? backgroundImageDataUrlOverride
            : await resolveBackgroundImageDataUrl(
                backgroundDesign,
                settings?.backgroundImageUri ?? null
              );
        if (stale) return;

        // 5. Batch state updates
        setDocumentWithTotals({
          ...enriched,
          issuerSnapshot: issuerInfo.issuerSnapshot,
        });
        setSensitiveSnapshot(issuerInfo.sensitiveSnapshot);
        setResolvedTemplateId(templateId);
        setResolvedSealSize(sealSize);
        setResolvedBackgroundDesign(backgroundDesign);
        setResolvedBackgroundImageDataUrl(backgroundImageDataUrl);
        setIsLoading(false);
      } catch (e) {
        if (!stale) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      stale = true;
    };
  }, [
    sourceKey,
    source.kind,
    templateIdOverride,
    sealSizeOverride,
    backgroundDesignOverride,
    backgroundImageDataUrlOverride,
  ]);

  // HTML 生成: 依存値が揃ってから 1 回計算
  const rawHtml = useMemo(() => {
    if (!documentWithTotals || !resolvedTemplateId || !resolvedSealSize || !resolvedBackgroundDesign) {
      return '';
    }
    try {
      const result = generateHtmlTemplate(
        buildPdfTemplateInput(documentWithTotals, sensitiveSnapshot, resolvedTemplateId, {
          sealSize: resolvedSealSize,
          backgroundDesign: resolvedBackgroundDesign,
          backgroundImageDataUrl: resolvedBackgroundImageDataUrl,
          blockPlacements:
            blockPlacementsOverride !== undefined
              ? blockPlacementsOverride
              : documentWithTotals.blockPlacements,
        })
      );
      return result.html;
    } catch {
      return '';
    }
  }, [
    documentWithTotals,
    sensitiveSnapshot,
    resolvedTemplateId,
    resolvedSealSize,
    resolvedBackgroundDesign,
    resolvedBackgroundImageDataUrl,
    blockPlacementsOverride,
  ]);

  const webView = useMemo(() => buildWebViewHtml(rawHtml, orientation), [rawHtml, orientation]);

  return {
    webViewHtml: webView.html,
    webViewCspApplied: webView.cspApplied,
    resolvedDocumentWithTotals: documentWithTotals,
    sensitiveSnapshot,
    resolvedTemplateId,
    resolvedSealSize: resolvedSealSize ?? null,
    isLoading,
    error,
  };
}
