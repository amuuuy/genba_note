/**
 * useDocumentPreviewHtml — Shared rendering pipeline for document preview/PDF.
 *
 * SPEC: SPEC_V1_0_2.md §6.3 (hybrid hook 設計、Q1=C 反映)
 *
 * preview.tsx と P5 の BlockPlacementModal で共用される。両者で webViewHtml
 * を取って WebView の source prop に渡すだけで、HTML 生成・依存解決・WebView
 * 加工 (CSP/landscape) は本 hook が一手に引き受ける。
 *
 * 設計の要点 (codex P3 iter1 fix 反映):
 * - **依存読込 (async I/O) と HTML 生成 (sync) を 2 段に分離**:
 *   - useEffect は source 変化時のみ走り、settings / issuer / background image
 *     を解決して `LoadedDeps` を state に保存。template/seal/background の
 *     override 変更では useEffect は走らず loader も立たない (旧 preview.tsx
 *     と同じく即時 HTML 再生成のみ)。
 *   - useMemo で resolved override + HTML 生成。HTML 生成失敗は `htmlError`
 *     として hook return の `error` に統合 (loading に閉じこもらない)。
 * - **previewDocument 内容変化検知**: sourceFingerprint に document.id +
 *   updatedAt を含めて、同一 id でも内容が変わったら再計算する。
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
import type { PdfTemplateInput, PdfTemplateResult } from '@/pdf/types';
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
  webViewHtml: string | null;
  webViewCspApplied: boolean;
  resolvedDocumentWithTotals: DocumentWithTotals | null;
  sensitiveSnapshot: SensitiveIssuerSnapshot | null;
  resolvedTemplateId: DocumentTemplateId | null;
  resolvedSealSize: SealSize | null;
  isLoading: boolean;
  error: Error | null;
}

// === Pure Helpers (exported for unit testing) ===

/**
 * source fingerprint — 同一 id でも内容変化を検知するため updatedAt を含める。
 * codex P3 iter1 blocking 2: previewDocument 内容変化検知のため。
 */
export function computeSourceFingerprint(source: DocumentPreviewSource): string {
  if (source.kind === 'documentId') return `id:${source.documentId}`;
  return `pv:${source.document.id}:${source.document.updatedAt}`;
}

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
    blockPlacements: options.blockPlacements,
  };
}

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

/**
 * generateHtmlTemplate の同期 try/catch wrapper (codex P3 iter1 blocking 3)。
 * HTML 生成失敗時は error を捕捉して `{ html: '', error }` を返す。
 * caller は `error` を hook return の error フィールドに伝播させ、loading に
 * 閉じこもらず error UI に遷移できるようにする。
 *
 * generator は default 引数で `generateHtmlTemplate` を渡しているが、テスト時
 * に throw を直接検証するため inject 可能にしている。
 */
export interface GenerateHtmlSafeResult {
  html: string;
  error: Error | null;
}

export function generateHtmlSafe(
  input: PdfTemplateInput,
  generator: (i: PdfTemplateInput) => PdfTemplateResult = generateHtmlTemplate
): GenerateHtmlSafeResult {
  try {
    const result = generator(input);
    return { html: result.html, error: null };
  } catch (e) {
    return {
      html: '',
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

// === Internal types for the deps-load stage ===

interface LoadedDeps {
  documentWithTotals: DocumentWithTotals;
  sensitiveSnapshot: SensitiveIssuerSnapshot | null;
  settings: AppSettings | null;
  /** settings.backgroundDesign 前提で pre-resolve 済み (override 時は別途解決が必要だが現状 UI に変更経路なし) */
  settingsBackgroundImageDataUrl: string | null;
}

// === Hook ===

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

  const [deps, setDeps] = useState<LoadedDeps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fingerprint = computeSourceFingerprint(source);

  // === Stage 1: deps load (async I/O, runs only when source changes) ===
  useEffect(() => {
    let stale = false;

    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);

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

        // 4. Settings
        const settingsResult = await getSettings();
        if (stale) return;
        const settings = settingsResult.success ? settingsResult.data ?? null : null;

        // 5. Background image (uses settings as default; override は同期で resolve 段で扱う)
        const settingsBackgroundImageDataUrl = await resolveBackgroundImageDataUrl(
          settings?.backgroundDesign,
          settings?.backgroundImageUri ?? null
        );
        if (stale) return;

        const loaded: LoadedDeps = {
          documentWithTotals: {
            ...enriched,
            issuerSnapshot: issuerInfo.issuerSnapshot,
          },
          sensitiveSnapshot: issuerInfo.sensitiveSnapshot,
          settings,
          settingsBackgroundImageDataUrl,
        };

        setDeps(loaded);
        setIsLoading(false);
      } catch (e) {
        if (!stale) {
          setDeps(null);
          setLoadError(e instanceof Error ? e : new Error(String(e)));
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      stale = true;
    };
    // 重要: source fingerprint のみに依存。template/seal/background override は
    // useMemo 段で同期に解決するため、ここで再走しない (codex P3 iter1 blocking 1)。
  }, [fingerprint]);

  // === Stage 2: synchronous resolve of overrides ===
  const resolvedTemplateId = useMemo<DocumentTemplateId | null>(() => {
    if (!deps) return null;
    return resolveTemplateIdFromSettings(
      deps.documentWithTotals.type,
      deps.settings,
      templateIdOverride
    );
  }, [deps, templateIdOverride]);

  const resolvedSealSize = useMemo<SealSize | null>(() => {
    if (!deps) return null;
    return sealSizeOverride ?? deps.settings?.sealSize ?? 'MEDIUM';
  }, [deps, sealSizeOverride]);

  const resolvedBackgroundDesign = useMemo<BackgroundDesign | null>(() => {
    if (!deps) return null;
    return backgroundDesignOverride ?? deps.settings?.backgroundDesign ?? 'NONE';
  }, [deps, backgroundDesignOverride]);

  const resolvedBackgroundImageDataUrl = useMemo<string | null>(() => {
    if (!deps) return null;
    return backgroundImageDataUrlOverride !== undefined
      ? backgroundImageDataUrlOverride
      : deps.settingsBackgroundImageDataUrl;
  }, [deps, backgroundImageDataUrlOverride]);

  // === Stage 3: HTML generation (sync, may throw — surfaced as error) ===
  const htmlResult = useMemo<{ html: string; error: Error | null }>(() => {
    if (
      !deps ||
      !resolvedTemplateId ||
      !resolvedSealSize ||
      !resolvedBackgroundDesign
    ) {
      return { html: '', error: null };
    }
    return generateHtmlSafe(
      buildPdfTemplateInput(
        deps.documentWithTotals,
        deps.sensitiveSnapshot,
        resolvedTemplateId,
        {
          sealSize: resolvedSealSize,
          backgroundDesign: resolvedBackgroundDesign,
          backgroundImageDataUrl: resolvedBackgroundImageDataUrl,
          blockPlacements:
            blockPlacementsOverride !== undefined
              ? blockPlacementsOverride
              : deps.documentWithTotals.blockPlacements,
        }
      )
    );
  }, [
    deps,
    resolvedTemplateId,
    resolvedSealSize,
    resolvedBackgroundDesign,
    resolvedBackgroundImageDataUrl,
    blockPlacementsOverride,
  ]);

  const webView = useMemo(
    () => buildWebViewHtml(htmlResult.html, orientation),
    [htmlResult.html, orientation]
  );

  // load 失敗が優先、無ければ html 生成失敗
  const error = loadError ?? htmlResult.error;

  return {
    webViewHtml: webView.html,
    webViewCspApplied: webView.cspApplied,
    resolvedDocumentWithTotals: deps?.documentWithTotals ?? null,
    sensitiveSnapshot: deps?.sensitiveSnapshot ?? null,
    resolvedTemplateId,
    resolvedSealSize,
    isLoading,
    error,
  };
}
