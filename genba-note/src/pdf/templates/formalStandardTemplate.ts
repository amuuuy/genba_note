/**
 * Formal Standard Template (FORMAL_STANDARD) - "正統派ビジネス文書"
 *
 * The original estimate template adapted for both estimate and invoice documents.
 * Based on the formal PDF template from pdfTemplateService.ts.
 *
 * Design characteristics:
 * - Gothic (sans-serif) font family
 * - 2-column header layout (client left, issuer+seal right)
 * - Seal positioned BESIDE issuer info (flexbox row)
 * - Black table header background
 * - Dotted border separators in totals section
 * - Centered title with full-width space characters
 *
 * Supports both estimate and invoice document types via getDocumentLabels().
 */

import type { DocumentWithTotals, IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';
import type { TemplateOptions } from './templateRegistry';
import { getSealSizePx, DEFAULT_SEAL_SIZE } from '@/pdf/types';
import { getBackgroundCss, getBackgroundHtml } from '@/pdf/backgroundDesigns';
import { getFormalThemeCss } from '@/pdf/themes';
import { FORMAL_COLORS } from '@/pdf/types';
import { getDocumentLabels } from './documentLabels';
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  escapeHtml,
  isValidImageDataUri,
} from '@/pdf/templateUtils';
import { isDefaultResolvedPlacement } from '@/pdf/blockPlacementResolver';
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from '@/pdf/blockPlacementDefaults';
import {
  computePerBlockStatus,
  placeBlocks,
  renderBlockLayoutTop,
  renderBlockLayoutBottom,
  BLOCK_LAYOUT_GRID_CSS,
  type RenderedBlocks,
} from '@/pdf/blockPlacementLayout';

// === Local Helpers ===

/**
 * Check if bank info has any non-null values
 */
function hasBankInfo(snapshot: SensitiveIssuerSnapshot | null): boolean {
  if (!snapshot) return false;
  return !!(
    snapshot.bankName ||
    snapshot.branchName ||
    snapshot.accountType ||
    snapshot.accountNumber ||
    snapshot.accountHolderName
  );
}

// === CSS ===

function getFormalStandardCss(sealSizePx: number): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Kaku Gothic Pro', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      padding: 30px 40px;
      background: #fff;
    }

    .document-container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* === Title === */
    .formal-title {
      font-size: 26px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.3em;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 25px;
    }

    /* === Two-column header === */
    .formal-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .header-left {
      flex: 1;
    }

    .header-right {
      text-align: right;
      font-size: 12px;
    }

    /* === Meta info === */
    .header-meta {
      margin-bottom: 15px;
    }

    .meta-row {
      margin-bottom: 4px;
    }

    .meta-label {
      font-weight: bold;
    }

    /* === Client section === */
    .formal-client-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .formal-client-name::after {
      content: ' 御中';
      font-weight: normal;
    }

    .client-address {
      font-size: 12px;
      color: #333;
    }

    /* === Greeting === */
    .greeting-text {
      font-size: 12px;
      margin-top: 15px;
    }

    /* === Issuer block: info BESIDE seal (flexbox row) === */
    .header-issuer-block {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      gap: 10px;
    }

    .issuer-info {
      text-align: right;
    }

    .issuer-company {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issuer-address {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .issuer-tel-fax {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .issuer-invoice-number {
      font-size: 11px;
      margin-bottom: 2px;
      color: #333;
    }

    .issuer-contact {
      font-size: 11px;
      margin-bottom: 2px;
    }

    /* === Seal container (beside issuer info) === */
    .issuer-seal {
      flex-shrink: 0;
      width: ${sealSizePx}px;
      height: ${sealSizePx}px;
    }

    .seal-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0.85;
      mix-blend-mode: multiply;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Info box === */
    .info-box {
      border: 1px solid #000;
      padding: 10px 15px;
      margin-bottom: 20px;
    }

    .info-box-row {
      margin-bottom: 6px;
    }

    .info-box-row:last-child {
      margin-bottom: 0;
    }

    .info-box-label {
      font-weight: bold;
      font-size: 11px;
      margin-right: 8px;
    }

    .info-box-value {
      font-size: 12px;
    }

    .bank-info-line {
      font-size: 11px;
      margin-left: 4px;
    }

    /* === Total amount box === */
    .total-amount-box {
      border: 2px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      margin-bottom: 20px;
    }

    .total-amount-box .label {
      font-size: 14px;
      font-weight: bold;
    }

    .total-amount-box .amount {
      font-size: 22px;
      font-weight: bold;
    }

    /* === Line items table === */
    .formal-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-items-table th {
      background: #000;
      color: #fff;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      font-size: 11px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #ccc;
      font-size: 11px;
    }

    .formal-items-table tr:nth-child(even) {
      background: #f5f5f5;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-items-table .col-name { width: 45%; }
    .formal-items-table .col-qty { width: 10%; text-align: right; }
    .formal-items-table .col-unit { width: 10%; text-align: center; }
    .formal-items-table .col-price { width: 15%; text-align: right; }
    .formal-items-table .col-total { width: 20%; text-align: right; }

    .formal-items-table .item-qty,
    .formal-items-table .item-price,
    .formal-items-table .item-total { text-align: right; }
    .formal-items-table .item-unit { text-align: center; }

    /* === Totals section (right-aligned, dotted borders) === */
    .formal-totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    .formal-totals-table {
      border-collapse: collapse;
      min-width: 250px;
    }

    .formal-totals-table td {
      padding: 6px 12px;
      font-size: 12px;
    }

    .formal-totals-table .totals-label {
      text-align: left;
      border-right: 1px solid #ccc;
    }

    .formal-totals-table .totals-value {
      text-align: right;
    }

    .formal-totals-table tr {
      border-bottom: 1px dotted #999;
    }

    .formal-totals-table .carried-forward-row td {
      color: #666;
    }

    .formal-totals-table .tax-breakdown-row td {
      font-size: 10px;
      color: #666;
      padding: 3px 12px;
    }

    .formal-totals-table .tax-rate-label {
      padding-left: 20px;
    }

    /* Total final row - most emphasized */
    .formal-totals-table .total-final-row {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      background: #f5f5f5;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-totals-table .total-final-row td {
      font-weight: bold;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    .formal-totals-table .total-final-label {
      font-size: 13px;
    }

    .formal-totals-table .total-final-value {
      font-size: 16px;
      color: #000;
    }

    /* === Notes section === */
    .formal-notes-section {
      margin: 25px 0;
      border: 1px solid #999;
    }

    .notes-title {
      background: #f0f0f0;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: bold;
      border-bottom: 1px solid #999;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .notes-content {
      padding: 10px;
      font-size: 11px;
      white-space: pre-wrap;
    }

    /* === Print === */
    @media print {
      body { padding: 20px; }
      .document-container { max-width: none; }
    }
  `;
}

// === Section Renderers ===

/**
 * Render the document title with full-width spaces
 */
function renderTitle(doc: DocumentWithTotals): string {
  const title = doc.type === 'estimate' ? '\u898B\u3000\u7A4D\u3000\u66F8' : '\u8ACB\u3000\u6C42\u3000\u66F8';
  return `<div class="formal-title">${title}</div>`;
}

// === Fragment primitives (P4-C-2-d, SPEC \u00A77.2.5) ===
//
// \u5404 generator \u304C\u300Cblock \u3092\u542B\u3080\u65E7 helper\u300D\u3068\u300Cblock \u3092\u629C\u3044\u305F\u7248\u300D\u3092\u4E8C\u91CD\u5B9F\u88C5\u3059\u308B
// \u306E\u3092\u907F\u3051\u308B\u305F\u3081\u3001\u65AD\u7247\u30D7\u30EA\u30DF\u30C6\u30A3\u30D6\u306B\u5206\u89E3\u3059\u308B\u3002legacy \u5408\u6210 (= \u65E7\u30B3\u30FC\u30C9\u518D\u73FE) \u3068
// override \u5408\u6210 (= \u5FC5\u8981\u90E8\u5206\u3060\u3051\u629C\u304F) \u3067 **\u540C\u3058\u65AD\u7247\u95A2\u6570\u3092\u5171\u6709** \u3059\u308B\u3002

/**
 * Build issuer info lines (without seal). Returns the array of <div> strings.
 * Used by both legacy renderIssuerBlock (composed with seal) and override branch
 * (composed without seal when seal is moved out of header).
 */
function buildIssuerInfoLines(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string[] {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);
  const infoLines: string[] = [];

  if (issuerSnapshot.companyName) {
    infoLines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }
  if (issuerSnapshot.address) {
    infoLines.push(`<div class="issuer-address">${escapeHtml(issuerSnapshot.address)}</div>`);
  }

  // TEL / FAX on the same line
  const telFaxParts: string[] = [];
  if (issuerSnapshot.phone) {
    telFaxParts.push(`TEL: ${escapeHtml(issuerSnapshot.phone)}`);
  }
  if (issuerSnapshot.fax) {
    telFaxParts.push(`FAX: ${escapeHtml(issuerSnapshot.fax)}`);
  }
  if (telFaxParts.length > 0) {
    infoLines.push(`<div class="issuer-tel-fax">${telFaxParts.join(' / ')}</div>`);
  }

  // Registration number (only for invoice)
  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    infoLines.push(`<div class="issuer-invoice-number">${escapeHtml('\u767B\u9332\u756A\u53F7')}: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  if (issuerSnapshot.contactPerson) {
    infoLines.push(`<div class="issuer-contact">${escapeHtml('\u62C5\u5F53')}: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  return infoLines;
}

/**
 * Issuer info text (seal \u3092\u542B\u307E\u306A\u3044 issuer info \u30C6\u30AD\u30B9\u30C8) \u2014 SPEC \u00A77.2.5.
 *
 * Returns `<div class="issuer-info">` wrapper. lines \u304C\u7A7A\u3067\u3082 wrapper \u3092\u51FA\u529B\u3059\u308B
 * (legacy \u4E92\u63DB: header-issuer-block \u5185\u3067 seal \u3060\u3051\u304C\u6B8B\u308B\u30B1\u30FC\u30B9\u306E empty issuer-info)\u3002
 * doc / sensitiveSnapshot \u3092\u53D6\u308B\u306E\u306F buildIssuerInfoLines \u304C doc.type / \u767B\u9332\u756A\u53F7\u5224\u5B9A\u306B
 * \u5FC5\u8981\u306A\u305F\u3081 (6 \u30C6\u30F3\u30D7\u30EC\u6A2A\u65AD\u3067\u540C\u3058\u5951\u7D04)\u3002
 */
function renderIssuerInfoText(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot);
  return `<div class="issuer-info">
          ${lines.join('\n          ')}
        </div>`;
}

/**
 * Seal \u5358\u72EC fragment (`<div class="issuer-seal">` \u5358\u4F4D) \u2014 SPEC \u00A77.2.5.
 *
 * sealSizePx \u306F CSS \u7D4C\u7531\u3067\u9069\u7528\u3055\u308C\u308B\u305F\u3081 fragment \u51FA\u529B\u306B\u306F\u542B\u3081\u306A\u3044\u3002
 * issuerSnapshot.sealImageBase64 \u306E\u307F\u3092\u53C2\u7167\u3059\u308B\u305F\u3081\u3001\u5F15\u6570\u3082 IssuerSnapshot \u306B
 * \u9650\u5B9A\u3059\u308B (\u4F9D\u5B58\u6700\u5C0F)\u3002
 */
function renderSealFragment(issuerSnapshot: IssuerSnapshot): string {
  const hasSeal = isValidImageDataUri(issuerSnapshot.sealImageBase64);
  if (!hasSeal) return '';
  return `<div class="issuer-seal"><img src="${issuerSnapshot.sealImageBase64}" alt="\u5370\u5F71" class="seal-image" /></div>`;
}

/**
 * Bank info \u5358\u72EC fragment (info-row level) \u2014 SPEC \u00A77.2.5.
 * \u632F\u8FBC\u53E3\u5EA7\u60C5\u5831\u3092 `<div class="info-box-row">` \u5358\u4F4D\u3067\u8FD4\u3059\u3002\u60C5\u5831\u7121\u3057\u306F ''\u3002
 * legacy \u3067\u306F info-box \u5185\u306E rows \u306E\u4E00\u3064\u3068\u3057\u3066\u3001override \u3067\u306F grid \u30BB\u30EB\u306B\u5358\u72EC\u914D\u7F6E\u3059\u308B\u3002
 */
function renderBankFragment(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  if (!hasBankInfo(sensitiveSnapshot)) return '';

  const bankLines: string[] = [];
  if (sensitiveSnapshot!.bankName) {
    bankLines.push(escapeHtml(sensitiveSnapshot!.bankName));
  }
  if (sensitiveSnapshot!.branchName) {
    bankLines.push(`${escapeHtml(sensitiveSnapshot!.branchName)}\u652F\u5E97`);
  }
  if (sensitiveSnapshot!.accountType) {
    bankLines.push(escapeHtml(sensitiveSnapshot!.accountType));
  }
  if (sensitiveSnapshot!.accountNumber) {
    bankLines.push(`\u53E3\u5EA7\u756A\u53F7: ${escapeHtml(sensitiveSnapshot!.accountNumber)}`);
  }
  if (sensitiveSnapshot!.accountHolderName) {
    bankLines.push(`\u53E3\u5EA7\u540D\u7FA9: ${escapeHtml(sensitiveSnapshot!.accountHolderName)}`);
  }

  return `
      <div class="info-box-row">
        <span class="info-box-label">\u304A\u632F\u8FBC\u5148:</span>
        <span class="info-box-value">${bankLines.join(' / ')}</span>
      </div>
    `;
}

/**
 * Notes \u5358\u72EC fragment (notes-section \u5358\u4F4D) \u2014 SPEC \u00A77.2.5.
 * `<div class="formal-notes-section">` \u3092\u542B\u3080\u5B8C\u5168\u306A\u5099\u8003\u30DC\u30C3\u30AF\u30B9\u3092\u8FD4\u3059\u3002
 * doc.notes \u304C null/\u7A7A\u3067\u3082 legacy \u4E92\u63DB\u306E\u305F\u3081\u7A7A box \u3092\u51FA\u529B\u3059\u308B (\u65E7\u6319\u52D5\u3092\u51CD\u7D50)\u3002
 */
function renderNotesFragment(doc: DocumentWithTotals): string {
  return `
    <div class="formal-notes-section">
      <div class="notes-title">\u5099\u8003</div>
      <div class="notes-content">${doc.notes ? escapeHtml(doc.notes) : ''}</div>
    </div>
  `;
}

/**
 * Render issuer block with seal BESIDE info (flexbox).
 *
 * Legacy branch composition: renderIssuerInfoText + renderSealFragment.
 * Override branch can call renderIssuerHeader(includeSeal=false) to render
 * the same wrapper without seal.
 */
function renderIssuerBlock(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  return renderIssuerHeader(doc, sensitiveSnapshot, /*includeSeal=*/true);
}

/**
 * Compose `.header-issuer-block` with optional seal inclusion.
 *
 * `includeSeal=false` is used by override branch when seal is moved out of
 * its default header position. Wraps the canonical primitives:
 * renderIssuerInfoText (always emitted) + renderSealFragment (conditional).
 *
 * "lines が空 AND seal も無い" ケースでは block 全体を省略する (legacy 互換)。
 */
function renderIssuerHeader(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeSeal: boolean
): string {
  const infoLines = buildIssuerInfoLines(doc, sensitiveSnapshot);
  const sealHtml = includeSeal ? renderSealFragment(doc.issuerSnapshot) : '';

  if (infoLines.length === 0 && sealHtml === '') {
    return '';
  }

  const issuerInfoHtml = renderIssuerInfoText(doc, sensitiveSnapshot);
  return `
      <div class="header-issuer-block">
        ${issuerInfoHtml}
        ${sealHtml}
      </div>
  `;
}

/**
 * info box \u306E rows \u69CB\u7BC9 (bank \u3092\u542B\u3080\u304B\u30D5\u30E9\u30B0\u3067\u5207\u66FF) \u2014 SPEC \u00A77.2.5.
 *
 * legacy \u7D4C\u8DEF (renderInfoBox) \u306F includeBank=true \u3067\u547C\u3073\u5F93\u6765\u901A\u308A bank \u884C\u3092\u542B\u3080\u3002
 * override \u7D4C\u8DEF\u3067 bank \u304C moved/hidden \u306E\u5834\u5408\u306F includeBank=false \u3067\u547C\u3073\u3001
 * subject/period \u884C\u306E\u307F\u8FD4\u3059\u3002bank fragment \u306F\u5225\u9014 grid \u30BB\u30EB\u306B\u914D\u7F6E\u3055\u308C\u308B\u3002
 *
 * showBankInfo=false (estimate) \u306E\u5834\u5408\u3001includeBank=true \u3067\u3082 bank \u306F\u542B\u307E\u308C\u306A\u3044
 * (\u30C6\u30F3\u30D7\u30EC\u4ED5\u69D8\u306E\u4E0A\u66F8\u304D)\u3002
 */
function renderInfoBoxRows(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeBank: boolean
): string {
  const labels = getDocumentLabels(doc.type);
  const rows: string[] = [];

  // Subject
  if (doc.subject) {
    rows.push(`
      <div class="info-box-row">
        <span class="info-box-label">\u4EF6\u540D:</span>
        <span class="info-box-value">${escapeHtml(doc.subject)}</span>
      </div>
    `);
  }

  // Period (validUntil for estimate, dueDate for invoice)
  const periodValue = doc[labels.periodField];
  if (periodValue) {
    rows.push(`
      <div class="info-box-row">
        <span class="info-box-label">${escapeHtml(labels.periodLabel)}:</span>
        <span class="info-box-value">${formatDate(periodValue)}</span>
      </div>
    `);
  }

  // Bank info (invoice only, gated by includeBank for override branch)
  if (includeBank && labels.showBankInfo) {
    const bankRow = renderBankFragment(sensitiveSnapshot);
    if (bankRow) rows.push(bankRow);
  }

  return rows.join('');
}

/**
 * Wrap `renderInfoBoxRows()` \u51fa\u529b\u3067 `<div class="info-box">` \u3092\u4f5c\u308b\u3002
 * \u7a7a rows \u306e\u5834\u5408\u306f wrapper \u81ea\u4f53\u3082\u7701\u7565 (rows \u304c\u7121\u3044\u306e\u306b\u67a0\u3060\u3051\u51fa\u3059\u306e\u3092\u9632\u3050)\u3002
 *
 * legacy / override \u4e21 branch \u3067 wrapper \u306e whitespace \u3092\u5b8c\u5168\u4e00\u81f4\u3055\u305b\u308b\u305f\u3081\u3001
 * \u3053\u306e\u5171\u901a helper \u7d4c\u7531\u3067\u7d44\u307f\u7acb\u3066\u308b\u3002
 */
function renderInfoBoxFromRows(rowsHtml: string): string {
  if (rowsHtml === '') {
    return '';
  }

  return `
    <div class="info-box">
      ${rowsHtml}
    </div>
  `;
}

/**
 * Render info box (subject, period, bank info for invoice) \u2014 legacy composition.
 *
 * Internally delegates to renderInfoBoxRows(includeBank=true) + renderInfoBoxFromRows.
 */
function renderInfoBox(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const rowsHtml = renderInfoBoxRows(doc, sensitiveSnapshot, /*includeBank=*/true);
  return renderInfoBoxFromRows(rowsHtml);
}

/**
 * Render line items table (black header, alternating rows)
 */
function renderLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}\u5186</td>
          <td class="item-total">${formatCurrency(item.subtotal)}\u5186</td>
        </tr>`;
  });

  return `
    <table class="formal-items-table">
      <thead>
        <tr>
          <th class="col-name">\u6458\u8981</th>
          <th class="col-qty">\u6570\u91CF</th>
          <th class="col-unit">\u5358\u4F4D</th>
          <th class="col-price">\u5358\u4FA1\uFF08\u7A0E\u629C\uFF09</th>
          <th class="col-total">\u91D1\u984D\uFF08\u7A0E\u629C\uFF09</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>
  `;
}

/**
 * Render totals section (right-aligned, dotted borders)
 */
function renderTotalsSection(doc: DocumentWithTotals): string {
  const carriedForward = doc.carriedForwardAmount ?? 0;
  const hasCarriedForward = carriedForward > 0;

  const carriedForwardRow = hasCarriedForward
    ? `
        <tr class="carried-forward-row">
          <td class="totals-label">\u7E70\u8D8A\u91D1\u984D</td>
          <td class="totals-value">${formatCurrency(carriedForward)}\u5186</td>
        </tr>`
    : '';

  // Tax breakdown rows with indent
  const taxBreakdownRows = doc.taxBreakdown
    .filter((tb) => tb.tax > 0)
    .map((tb) => {
      const rateLabel = tb.rate === 0 ? '\u975E\u8AB2\u7A0E' : `${tb.rate}%`;
      return `
        <tr class="tax-breakdown-row">
          <td class="totals-label tax-rate-label">\u3000\u6D88\u8CBB\u7A0E(${rateLabel})</td>
          <td class="totals-value">${formatCurrency(tb.tax)}\u5186</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="formal-totals-section">
      <table class="formal-totals-table">
        <tr>
          <td class="totals-label">\u5C0F\u8A08\uFF08\u7A0E\u629C\uFF09</td>
          <td class="totals-value">${formatCurrency(doc.subtotalYen)}\u5186</td>
        </tr>
        <tr class="tax-total-row">
          <td class="totals-label">\u6D88\u8CBB\u7A0E</td>
          <td class="totals-value">${formatCurrency(doc.taxYen)}\u5186</td>
        </tr>
        ${taxBreakdownRows}${carriedForwardRow}
        <tr class="total-final-row">
          <td class="totals-label total-final-label">\u5408\u8A08\uFF08\u7A0E\u8FBC\uFF09</td>
          <td class="totals-value total-final-value">${formatCurrency(doc.totalYen)}\u5186</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Render notes section \u2014 legacy composition.
 *
 * Internally delegates to renderNotesFragment to share the box markup with
 * override branch (where notes is placed in a grid cell at moved position).
 */
function renderNotesSection(doc: DocumentWithTotals): string {
  return renderNotesFragment(doc);
}

// === Main Template Generator ===

/**
 * Generate FORMAL_STANDARD template HTML
 *
 * Creates a formal business document ("正統派ビジネス文書") with Gothic typeface,
 * 2-column header, seal beside issuer info, black table headers, and dotted totals borders.
 *
 * @param doc - Document with calculated totals
 * @param sensitiveSnapshot - Sensitive issuer information (bank account, etc.)
 * @param options - Template options (seal size, background design)
 * @returns Complete HTML string for the document
 */
export function generateFormalStandardTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  // SPEC §5.1 / §7.2 hybrid pattern:
  //   default 一致 → legacy DOM そのまま (旧コード完全実行、pixel diff 0 を保証)
  //   override   → block-by-block extraction + dual anchor grid (P4-C-2-d)
  const isDefault = isDefaultResolvedPlacement(options.blockPlacements, 'FORMAL_STANDARD');

  const labels = getDocumentLabels(doc.type);
  const sealSizePx = getSealSizePx(options.sealSize ?? DEFAULT_SEAL_SIZE, 'FORMAL_STANDARD');
  const backgroundCss = getBackgroundCss(options.backgroundDesign, options.backgroundImageDataUrl);
  const backgroundHtml = getBackgroundHtml(options.backgroundDesign, options.backgroundImageDataUrl);
  const themeCss = getFormalThemeCss(FORMAL_COLORS);
  const css = getFormalStandardCss(sealSizePx);

  // === Block placement decisions (legacy / override) ===
  //
  // legacy branch: 旧 DOM そのまま。block-layout-* / override CSS は一切出力しない。
  //   全 inject points (`${overrideCss}` / `${blockLayoutTopHtml}` /
  //   `${blockLayoutBottomHtml}`) は空文字。テンプレート whitespace に変化なし
  //   → fixture diff 0 を維持。
  // override branch: block-by-block extraction で legacy DOM から moved block を
  //   抜き、dual anchor grid (header 後 / totals 後) に配置。BLOCK_LAYOUT_GRID_CSS
  //   は実際に grid を出す時のみ inject。
  let issuerHtml: string;
  let infoBoxHtml: string;
  let notesHtml: string;
  let blockLayoutTopHtml = '';
  let blockLayoutBottomHtml = '';
  let overrideCss = '';

  if (isDefault) {
    issuerHtml = renderIssuerBlock(doc, sensitiveSnapshot);
    infoBoxHtml = renderInfoBox(doc, sensitiveSnapshot);
    notesHtml = renderNotesSection(doc);
  } else {
    const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.FORMAL_STANDARD;
    const perBlock = computePerBlockStatus(options.blockPlacements, templateDefault);

    // Legacy positions: untouched-at-default block は legacy DOM 内にそのまま残す。
    //   companyStamp untouched → header に seal 残す
    //   bankAccount untouched   → info-box に bank 残す (showBankInfo 時のみ)
    //   remarks untouched       → notes-section をそのまま出力
    issuerHtml = renderIssuerHeader(
      doc,
      sensitiveSnapshot,
      /*includeSeal=*/perBlock.companyStamp.isDefault
    );
    const rowsHtml = renderInfoBoxRows(
      doc,
      sensitiveSnapshot,
      /*includeBank=*/perBlock.bankAccount.isDefault
    );
    infoBoxHtml = renderInfoBoxFromRows(rowsHtml);
    notesHtml = perBlock.remarks.isDefault ? renderNotesSection(doc) : '';

    // Grid placement: moved block (isDefault=false かつ position !== 'hidden') のみ
    // grid セルへ配置。hidden / untouched は空 fragment を渡し placeBlocks で skip。
    // estimate では showBankInfo=false のため bank fragment は常に空 (UX: 見積で
    // bank 設定を弄っても見た目は変わらない)。
    const renderedBlocks: RenderedBlocks = {
      bankAccount: !perBlock.bankAccount.isDefault && labels.showBankInfo
        ? renderBankFragment(sensitiveSnapshot)
        : '',
      companyStamp: !perBlock.companyStamp.isDefault
        ? renderSealFragment(doc.issuerSnapshot)
        : '',
      remarks: !perBlock.remarks.isDefault
        ? renderNotesFragment(doc)
        : '',
    };

    const cells = placeBlocks(options.blockPlacements, renderedBlocks);
    const topRegion = renderBlockLayoutTop(cells);
    const bottomRegion = renderBlockLayoutBottom(cells);

    // Inject points を「空ならゼロ文字、出力時のみ前置改行+indent」にすることで
    // legacy 時の whitespace を完全保持する (pixel diff 0 ゲート保護)。
    blockLayoutTopHtml = topRegion ? `\n    ${topRegion}` : '';
    blockLayoutBottomHtml = bottomRegion ? `\n    ${bottomRegion}` : '';

    if (topRegion || bottomRegion) {
      overrideCss = `
    ${BLOCK_LAYOUT_GRID_CSS}`;
    }
  }

  // Title
  const titleHtml = renderTitle(doc);

  // Client address
  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  // Greeting text
  const greetingText = doc.type === 'estimate'
    ? '\u4E0B\u8A18\u306E\u3068\u304A\u308A\u304A\u898B\u7A4D\u308A\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002'
    : labels.greeting;

  // Meta info
  const metaHtml = `
        <div class="header-meta">
          <div class="meta-row"><span class="meta-label">${escapeHtml(labels.dateLabel)}:</span> ${formatDate(doc.issueDate)}</div>
          <div class="meta-row"><span class="meta-label">${escapeHtml(labels.numberLabel)}:</span> ${escapeHtml(doc.documentNo)}</div>
        </div>
  `;

  // Total amount box
  const totalBoxHtml = `
    <div class="total-amount-box">
      <span class="label">\u5408\u8A08\uFF08\u7A0E\u8FBC\uFF09</span>
      <span class="amount">${formatCurrency(doc.totalYen)}\u5186</span>
    </div>
  `;

  // Line items table
  const tableHtml = renderLineItemsTable(doc);

  // Totals section
  const totalsHtml = renderTotalsSection(doc);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${css}
    ${themeCss}
    ${backgroundCss}${overrideCss}
  </style>
</head>
<body>
  <div class="document-container">
    ${backgroundHtml}
    <!-- Title -->
    ${titleHtml}

    <!-- Two-column header -->
    <div class="formal-header">
      <div class="header-left">
        <div class="formal-client-name">${escapeHtml(doc.clientName)}</div>
        ${clientAddressHtml}
        <div class="greeting-text">${escapeHtml(greetingText)}</div>
      </div>
      <div class="header-right">
        ${metaHtml}
        ${issuerHtml}
      </div>
    </div>${blockLayoutTopHtml}

    <!-- Info box (subject, period, bank info) -->
    ${infoBoxHtml}

    <!-- Total amount -->
    ${totalBoxHtml}

    <!-- Line items -->
    ${tableHtml}

    <!-- Totals -->
    ${totalsHtml}${blockLayoutBottomHtml}

    <!-- Notes -->
    ${notesHtml}
  </div>
</body>
</html>`;
}
