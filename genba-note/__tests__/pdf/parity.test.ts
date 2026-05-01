/**
 * Preview ⇔ Print HTML parity tests (SPEC §8.5).
 *
 * preview 経路 (useDocumentPreviewHtml hook 内 deriveDisplayHtml + injectCsp) と
 * print 経路 (generateAndSharePdf 内 injectLandscapeCss + injectSinglePageEnforcement)
 * は同じ base HTML (`generateHtmlTemplate({ mode: 'pdf' })`) から生成される。
 * 両者の正規化後 (片側だけに入る inject 削除) HTML が完全一致することを担保する。
 *
 * これにより「preview で見たまま PDF が出る」という UX 約束を test 担保する。
 *
 * 範囲 (SPEC §8.5): 代表 3 テンプレ × 配置 3 パターン = 9 ケース
 *   テンプレ: FORMAL_STANDARD / MODERN / CONSTRUCTION
 *   配置: default (null) / 振込 top-right override / 印影 hidden override
 */

import {
  generateHtmlTemplate,
  injectLandscapeCss,
} from '@/pdf/pdfTemplateService';
import { deriveDisplayHtml } from '@/pdf/pdfTemplateService';
import { injectSinglePageEnforcement } from '@/pdf/singlePageService';
import {
  injectCsp,
  normalizeForParity,
} from '@/utils/previewHtmlSecurity';
import {
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
  createTestIssuerSnapshot,
  createTestLineItem,
  resetTestIdCounter,
} from './helpers';
import type { DocumentWithTotals } from '@/types/document';
import type { BlockPlacements } from '@/types/blockPlacement';
import type { DocumentTemplateId, PreviewOrientation } from '@/types/settings';

const TEST_SEAL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

const FIXED_TS = 1735603200000;

function makeDoc(): DocumentWithTotals {
  resetTestIdCounter();
  return createTestDocumentWithTotals({
    id: 'parity-doc-1',
    type: 'invoice',
    documentNo: 'INV-PARITY',
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
    issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: TEST_SEAL }),
    notes: 'parity 確認用備考',
    lineItems: [createTestLineItem({ id: 'parity-line-1' })],
  });
}

/**
 * Generate preview-side HTML (deriveDisplayHtml + injectCsp).
 * useDocumentPreviewHtml hook と同じ stack を直接組む。
 */
function generatePreviewHtml(
  templateId: DocumentTemplateId,
  blockPlacements: BlockPlacements | null,
  orientation: PreviewOrientation = 'PORTRAIT'
): string {
  const doc = makeDoc();
  const sensitive = createTestSensitiveSnapshot();
  const baseResult = generateHtmlTemplate({
    document: doc,
    sensitiveSnapshot: sensitive,
    mode: 'pdf',
    templateId,
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    blockPlacements,
  });
  const displayHtml = deriveDisplayHtml(baseResult.html, orientation);
  const cspResult = injectCsp(displayHtml);
  return cspResult.html;
}

/**
 * Generate print-side HTML (injectLandscapeCss + injectSinglePageEnforcement).
 * generateAndSharePdf 内処理を抜き出した形 (settings 解決は省略、固定値で生成)。
 */
function generatePrintHtml(
  templateId: DocumentTemplateId,
  blockPlacements: BlockPlacements | null,
  orientation: PreviewOrientation = 'PORTRAIT'
): string {
  const doc = makeDoc();
  const sensitive = createTestSensitiveSnapshot();
  const baseResult = generateHtmlTemplate({
    document: doc,
    sensitiveSnapshot: sensitive,
    mode: 'pdf',
    templateId,
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    blockPlacements,
  });
  let html = baseResult.html;
  if (orientation === 'LANDSCAPE') {
    html = injectLandscapeCss(html);
  }
  const singlePageResult = injectSinglePageEnforcement(html, orientation === 'LANDSCAPE');
  return singlePageResult.html;
}

// === Test cases (3 templates × 3 placements = 9 cases) ===

const TEMPLATES_FOR_PARITY: readonly DocumentTemplateId[] = [
  'FORMAL_STANDARD',
  'MODERN',
  'CONSTRUCTION',
];

interface PlacementCase {
  label: string;
  placements: BlockPlacements | null;
}

const PLACEMENT_CASES: readonly PlacementCase[] = [
  { label: 'default (null)', placements: null },
  {
    label: '振込先 top-right override',
    placements: { bankAccount: 'top-right' },
  },
  {
    label: '印影 hidden override',
    placements: { companyStamp: 'hidden' },
  },
];

describe('Preview ⇔ Print HTML parity (SPEC §8.5, P6-A)', () => {
  TEMPLATES_FOR_PARITY.forEach((templateId) => {
    PLACEMENT_CASES.forEach((placementCase) => {
      it(`${templateId} × ${placementCase.label}: preview と print の base HTML が parity (PORTRAIT)`, () => {
        const previewHtml = generatePreviewHtml(templateId, placementCase.placements);
        const printHtml = generatePrintHtml(templateId, placementCase.placements);
        expect(normalizeForParity(previewHtml)).toEqual(normalizeForParity(printHtml));
      });
    });
  });
});

// === normalizeForParity helper unit tests ===
//
// 「片側だけに入る inject」が確実に除去され、両 HTML の base 部分が parity 比較
// 可能になることを担保。回帰テストとして重要 (将来 inject markup が変わると
// parity 比較が壊れる可能性がある)。

describe('normalizeForParity helper', () => {
  const TEMPLATE_FOR_NORMALIZE: DocumentTemplateId = 'FORMAL_STANDARD';

  it('removes CSP meta tag (preview only)', () => {
    const previewHtml = generatePreviewHtml(TEMPLATE_FOR_NORMALIZE, null);
    expect(previewHtml).toContain('Content-Security-Policy');
    expect(normalizeForParity(previewHtml)).not.toContain('Content-Security-Policy');
  });

  it('removes viewport meta tag (preview width=800 / print width=device-width)', () => {
    const previewHtml = generatePreviewHtml(TEMPLATE_FOR_NORMALIZE, null);
    const printHtml = generatePrintHtml(TEMPLATE_FOR_NORMALIZE, null);
    // preview には width=800 (PORTRAIT inject)、print には width=device-width (template default)
    expect(previewHtml).toMatch(/<meta\s+name="viewport"[^>]*width=800/);
    expect(printHtml).toMatch(/<meta\s+name="viewport"[^>]*width=device-width/);
    // normalize 後は両方とも viewport meta が消える
    expect(normalizeForParity(previewHtml)).not.toMatch(/<meta\s+name="viewport"/);
    expect(normalizeForParity(printHtml)).not.toMatch(/<meta\s+name="viewport"/);
  });

  it('removes single-page enforcement script (print only)', () => {
    const printHtml = generatePrintHtml(TEMPLATE_FOR_NORMALIZE, null);
    // single-page script は `<script>(function() { ... })();</script>` パターン
    expect(printHtml).toMatch(/<script>\s*\(function\(\)/);
    expect(normalizeForParity(printHtml)).not.toMatch(/<script>\s*\(function\(\)/);
  });

  it('preserves print-color-adjust property (template body CSS, not normalized)', () => {
    // SPEC §8.5: print-color-adjust はテンプレ本体 CSS なので比較対象に残す
    const previewHtml = generatePreviewHtml(TEMPLATE_FOR_NORMALIZE, null);
    expect(previewHtml).toContain('print-color-adjust');
    expect(normalizeForParity(previewHtml)).toContain('print-color-adjust');
  });

  it('idempotent: normalize(normalize(x)) === normalize(x)', () => {
    const previewHtml = generatePreviewHtml(TEMPLATE_FOR_NORMALIZE, null);
    const once = normalizeForParity(previewHtml);
    const twice = normalizeForParity(once);
    expect(twice).toEqual(once);
  });
});

// === LANDSCAPE orientation parity (任意 spot check) ===
//
// LANDSCAPE では preview/print 両方で injectLandscapeCss が呼ばれるため、両者は
// 同じ landscape CSS 断片を持つ。viewport meta は preview width=1130 / print も
// width=1130 で一致 (injectLandscapeCss が両方に同じ inject を入れるため)、ただし
// preview には CSP / single-page CSS only / print には single-page enforcement
// が追加される。normalizer は LANDSCAPE 経路でも parity を担保する必要がある。

describe('Preview ⇔ Print HTML parity (LANDSCAPE spot check)', () => {
  it('FORMAL_STANDARD × default × LANDSCAPE: parity', () => {
    const previewHtml = generatePreviewHtml('FORMAL_STANDARD', null, 'LANDSCAPE');
    const printHtml = generatePrintHtml('FORMAL_STANDARD', null, 'LANDSCAPE');
    expect(normalizeForParity(previewHtml)).toEqual(normalizeForParity(printHtml));
  });
});
