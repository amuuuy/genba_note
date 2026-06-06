/**
 * Modern Template
 *
 * Clean, modern PDF template with blue accent color and 1-column flow layout.
 * Uses left accent bar, card-style totals, and borderless table design.
 *
 * Design:
 * - Accent color: #2563EB (blue)
 * - 1-column sequential flow: title -> meta -> client -> issuer
 * - Left 4px accent bar on page
 * - Transparent table header with accent-color text
 * - Card-style totals section with light blue background
 * - No black labels; labels are accent color small text
 */

import type { DocumentWithTotals, IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';
import type { TemplateOptions } from './templateRegistry';
import { getSealSizePx, DEFAULT_SEAL_SIZE } from '@/pdf/types';
import { getBackgroundCss, getBackgroundHtml } from '@/pdf/backgroundDesigns';
import { getDocumentLabels } from './documentLabels';
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  parseAddressWithPostalCode,
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

// === Constants ===

const ACCENT = '#2563EB';
const TEXT_COLOR = '#1F2937';
const SUB_TEXT = '#6B7280';
const DIVIDER = '#E5E7EB';
const TOTALS_BG = '#EFF6FF';
const TOTALS_BORDER = '#BFDBFE';

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

// === Section Renderers ===

/**
 * Render meta info (date label, date value, number label, number value)
 */
function renderMeta(doc: DocumentWithTotals): string {
  const labels = getDocumentLabels(doc.type);

  const periodValue = doc[labels.periodField];
  const periodHtml = periodValue
    ? `<div class="meta-row"><span class="meta-label">${escapeHtml(labels.periodLabel)}</span><span class="meta-value">${formatDate(periodValue)}</span></div>`
    : '';

  return `
    <div class="meta-section">
      <div class="meta-row">
        <span class="meta-label">${escapeHtml(labels.numberLabel)}</span>
        <span class="meta-value">${escapeHtml(doc.documentNo)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">${escapeHtml(labels.dateLabel)}</span>
        <span class="meta-value">${formatDate(doc.issueDate)}</span>
      </div>
      ${periodHtml}
    </div>
  `;
}

/**
 * Render client section with name + "御中" + address
 */
function renderClient(doc: DocumentWithTotals): string {
  const labels = getDocumentLabels(doc.type);

  const addressParts: string[] = [];
  if (doc.clientAddress) {
    const parsed = parseAddressWithPostalCode(doc.clientAddress);
    if (parsed.postalCode) {
      addressParts.push(`<div class="client-postal">${escapeHtml(parsed.postalCode)}</div>`);
    }
    if (parsed.addressLine1) {
      addressParts.push(`<div class="client-address-line">${escapeHtml(parsed.addressLine1)}</div>`);
    }
    if (parsed.addressLine2) {
      addressParts.push(`<div class="client-address-line">${escapeHtml(parsed.addressLine2)}</div>`);
    }
  }

  const subjectHtml = doc.subject
    ? `<div class="client-subject"><span class="info-label-text">件名</span><span class="info-value-text">${escapeHtml(doc.subject)}</span></div>`
    : '';

  return `
    <div class="client-section">
      ${addressParts.join('\n      ')}
      <div class="client-name">${escapeHtml(doc.clientName)}<span class="client-suffix">御中</span></div>
      <div class="greeting-text">${escapeHtml(labels.greeting)}</div>
      ${subjectHtml}
    </div>
  `;
}

// === Fragment primitives (P4-C-5 MODERN, SPEC §7.2.5) ===
// FORMAL/ACCOUNTING/SIMPLE/CLASSIC で確立した pattern を MODERN に適用。
// MODERN の seal は flexbox の隣 (FORMAL に類似)、bank/notes は独立 section。

/**
 * Seal 単独 fragment — SPEC §7.2.5。issuerSnapshot のみ参照。
 */
function renderSealFragment(issuerSnapshot: IssuerSnapshot): string {
  const hasSeal = isValidImageDataUri(issuerSnapshot.sealImageBase64);
  if (!hasSeal) return '';
  return `<div class="issuer-seal"><img src="${issuerSnapshot.sealImageBase64}" alt="印影" class="seal-image" /></div>`;
}

/**
 * Build issuer info lines (without seal). FORMAL と同 pattern (seal は別 render)。
 */
function buildIssuerInfoLines(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string[] {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);

  const lines: string[] = [];

  if (issuerSnapshot.companyName) {
    lines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }
  if (issuerSnapshot.representativeName) {
    lines.push(`<div class="issuer-rep">${escapeHtml(issuerSnapshot.representativeName)}</div>`);
  }

  const parsedAddress = parseAddressWithPostalCode(issuerSnapshot.address);
  if (parsedAddress.postalCode) {
    lines.push(`<div class="issuer-detail">${escapeHtml(parsedAddress.postalCode)}</div>`);
  }
  if (parsedAddress.addressLine1) {
    lines.push(`<div class="issuer-detail">${escapeHtml(parsedAddress.addressLine1)}</div>`);
  }
  if (parsedAddress.addressLine2) {
    lines.push(`<div class="issuer-detail">${escapeHtml(parsedAddress.addressLine2)}</div>`);
  }

  const telFaxParts: string[] = [];
  if (issuerSnapshot.phone) {
    telFaxParts.push(`TEL: ${escapeHtml(issuerSnapshot.phone)}`);
  }
  if (issuerSnapshot.fax) {
    telFaxParts.push(`FAX: ${escapeHtml(issuerSnapshot.fax)}`);
  }
  if (telFaxParts.length > 0) {
    lines.push(`<div class="issuer-detail">${telFaxParts.join(' / ')}</div>`);
  }

  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    lines.push(`<div class="issuer-registration">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  if (issuerSnapshot.contactPerson) {
    lines.push(`<div class="issuer-detail">担当: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  return lines;
}

/**
 * Issuer info text (seal を含まない issuer-section) — SPEC §7.2.5。
 * override 経路で seal が moved の時 header 相当を seal なしで出力。FORMAL と同 pattern。
 */
function renderIssuerInfoText(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot);
  if (lines.length === 0) return '';
  return `
    <div class="issuer-section">
      <div class="issuer-block">
        <div class="issuer-info">
          ${lines.join('\n          ')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render issuer section (right-aligned, with seal) — legacy composition.
 */
function renderIssuer(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot);
  const sealHtml = renderSealFragment(doc.issuerSnapshot);

  if (lines.length === 0 && sealHtml === '') {
    return '';
  }

  return `
    <div class="issuer-section">
      <div class="issuer-block">
        <div class="issuer-info">
          ${lines.join('\n          ')}
        </div>
        ${sealHtml}
      </div>
    </div>
  `;
}

/**
 * Render line items table (modern style: transparent header, accent text, no vertical lines)
 */
function renderLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-spec">${escapeHtml(item.spec ?? '')}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}円</td>
          <td class="item-total">${formatCurrency(item.subtotal)}円</td>
        </tr>`;
  });

  return `
    <table class="modern-items-table">
      <thead>
        <tr>
          <th class="col-name">名称</th>
          <th class="col-spec">仕様</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単位</th>
          <th class="col-price">単価（税抜）</th>
          <th class="col-total">金額（税抜）</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>
  `;
}

/**
 * Render totals section (card style with light blue background)
 */
function renderTotalsCard(doc: DocumentWithTotals): string {
  const carriedForward = doc.carriedForwardAmount ?? 0;
  const hasCarriedForward = carriedForward > 0;

  const taxBreakdownRows = doc.taxBreakdown.map((tb) => {
    const rateLabel = tb.rate === 0 ? '非課税対象' : `${tb.rate}%対象`;
    const taxLabel = tb.rate === 0 ? '非課税' : `消費税(${tb.rate}%)`;
    return `
        <div class="totals-detail-row">
          <span class="totals-detail-label">${rateLabel}: ${formatCurrency(tb.subtotal)}円</span>
          <span class="totals-detail-value">${taxLabel}: ${formatCurrency(tb.tax)}円</span>
        </div>`;
  });

  const carriedForwardRow = hasCarriedForward
    ? `
        <div class="totals-row">
          <span class="totals-label">繰越金額</span>
          <span class="totals-value">${formatCurrency(carriedForward)}円</span>
        </div>`
    : '';

  return `
    <div class="totals-card">
      <div class="totals-row">
        <span class="totals-label">小計（税抜）</span>
        <span class="totals-value">${formatCurrency(doc.subtotalYen)}円</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">消費税</span>
        <span class="totals-value">${formatCurrency(doc.taxYen)}円</span>
      </div>
      ${taxBreakdownRows.join('\n')}
      ${carriedForwardRow}
      <div class="totals-row totals-total">
        <span class="totals-label">合計（税込）</span>
        <span class="totals-amount">${formatCurrency(doc.totalYen)}円</span>
      </div>
    </div>
  `;
}

/**
 * Bank info 単独 fragment — SPEC §7.2.5。
 *
 * MODERN の bank は独立 section (`<div class="bank-section">`) なので、grid cell
 * に `<div>` のまま投入して HTML valid。ACCOUNTING/CLASSIC のように table wrapper を
 * 追加する必要はない。
 */
function renderBankFragment(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  if (!hasBankInfo(sensitiveSnapshot)) return '';

  const lines: string[] = [];
  if (sensitiveSnapshot!.bankName) {
    let bankLine = escapeHtml(sensitiveSnapshot!.bankName);
    if (sensitiveSnapshot!.branchName) {
      bankLine += ` ${escapeHtml(sensitiveSnapshot!.branchName)}支店`;
    }
    lines.push(`<div class="bank-detail">${bankLine}</div>`);
  }
  if (sensitiveSnapshot!.accountType) {
    lines.push(`<div class="bank-detail">${escapeHtml(sensitiveSnapshot!.accountType)}</div>`);
  }
  if (sensitiveSnapshot!.accountNumber) {
    lines.push(`<div class="bank-detail">口座番号: ${escapeHtml(sensitiveSnapshot!.accountNumber)}</div>`);
  }
  if (sensitiveSnapshot!.accountHolderName) {
    lines.push(`<div class="bank-detail">口座名義: ${escapeHtml(sensitiveSnapshot!.accountHolderName)}</div>`);
  }

  return `
    <div class="bank-section">
      <div class="info-label-text">お振込先</div>
      ${lines.join('\n      ')}
    </div>
  `;
}

/**
 * Render bank info section (invoice only) — legacy composition.
 */
function renderBankInfo(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  return renderBankFragment(sensitiveSnapshot);
}

/**
 * Notes 単独 fragment — SPEC §7.2.5。
 * MODERN は doc.notes 空なら空文字 (SIMPLE と同 pattern)。
 */
function renderNotesFragment(doc: DocumentWithTotals): string {
  if (!doc.notes) return '';
  return `
    <div class="notes-section">
      <div class="notes-title">備考</div>
      <div class="notes-content">${escapeHtml(doc.notes)}</div>
    </div>
  `;
}

/**
 * Render notes section (borderless, top line only) — legacy composition.
 */
function renderNotes(doc: DocumentWithTotals): string {
  return renderNotesFragment(doc);
}

// === CSS ===

function getModernCss(sealSizePx: number): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Kaku Gothic Pro', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: ${TEXT_COLOR};
      background: #fff;
      padding: 30px 40px 30px 44px;
      border-left: 4px solid ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .document-container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* === Title === */
    .modern-title {
      font-size: 24px;
      font-weight: bold;
      color: ${TEXT_COLOR};
      text-align: left;
      border-bottom: 3px solid ${ACCENT};
      padding-bottom: 8px;
      margin-bottom: 24px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Meta Section === */
    .meta-section {
      margin-bottom: 24px;
    }

    .meta-row {
      margin-bottom: 4px;
    }

    .meta-label {
      font-size: 12px;
      color: ${SUB_TEXT};
      margin-right: 12px;
    }

    .meta-value {
      font-size: 13px;
      color: ${TEXT_COLOR};
    }

    /* === Client Section === */
    .client-section {
      margin-bottom: 32px;
    }

    .client-postal {
      font-size: 12px;
      color: ${SUB_TEXT};
    }

    .client-address-line {
      font-size: 13px;
      color: ${TEXT_COLOR};
      margin-bottom: 2px;
    }

    .client-name {
      font-size: 18px;
      font-weight: bold;
      color: ${TEXT_COLOR};
      margin-bottom: 4px;
    }

    .client-suffix {
      font-weight: normal;
      margin-left: 8px;
    }

    .greeting-text {
      font-size: 13px;
      color: ${SUB_TEXT};
      margin-top: 8px;
    }

    .client-subject {
      margin-top: 8px;
    }

    /* === Info Labels (accent color small text, no black labels) === */
    .info-label-text {
      font-size: 11px;
      font-weight: bold;
      color: ${ACCENT};
      margin-right: 8px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .info-value-text {
      font-size: 13px;
      color: ${TEXT_COLOR};
    }

    /* === Issuer Section === */
    .issuer-section {
      margin-bottom: 32px;
      text-align: right;
    }

    .issuer-block {
      display: inline-flex;
      align-items: flex-start;
      gap: 12px;
    }

    .issuer-info {
      text-align: right;
    }

    .issuer-company {
      font-size: 15px;
      font-weight: bold;
      color: ${TEXT_COLOR};
      margin-bottom: 4px;
    }

    .issuer-rep {
      font-size: 13px;
      color: ${TEXT_COLOR};
      margin-bottom: 2px;
    }

    .issuer-detail {
      font-size: 12px;
      color: ${SUB_TEXT};
      margin-bottom: 2px;
    }

    .issuer-registration {
      font-size: 11px;
      color: ${SUB_TEXT};
      margin-bottom: 2px;
    }

    .issuer-seal {
      flex-shrink: 0;
    }

    .seal-image {
      width: ${sealSizePx}px;
      height: ${sealSizePx}px;
      object-fit: contain;
      opacity: 0.85;
      mix-blend-mode: multiply;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Line Items Table === */
    .modern-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .modern-items-table th {
      background: transparent;
      color: ${ACCENT};
      font-weight: bold;
      font-size: 12px;
      padding: 12px 16px;
      border-bottom: 3px solid ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .modern-items-table td {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid ${DIVIDER};
      background: #fff;
    }

    .modern-items-table .col-name { width: 28%; text-align: left; }
    .modern-items-table .col-spec { width: 16%; text-align: left; }
    .modern-items-table .col-qty { width: 9%; text-align: right; }
    .modern-items-table .col-unit { width: 9%; text-align: center; }
    .modern-items-table .col-price { width: 17%; text-align: right; }
    .modern-items-table .col-total { width: 21%; text-align: right; }

    .modern-items-table .item-name { text-align: left; }
    .modern-items-table .item-spec { text-align: left; }
    .modern-items-table .item-qty { text-align: right; }
    .modern-items-table .item-unit { text-align: center; }
    .modern-items-table .item-price { text-align: right; }
    .modern-items-table .item-total { text-align: right; }

    /* === Totals Card === */
    .totals-card {
      background-color: ${TOTALS_BG};
      border: 1px solid ${TOTALS_BORDER};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 32px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 4px 0;
    }

    .totals-label {
      font-size: 13px;
      color: ${TEXT_COLOR};
    }

    .totals-value {
      font-size: 13px;
      color: ${TEXT_COLOR};
      font-weight: bold;
    }

    .totals-detail-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }

    .totals-detail-label {
      font-size: 11px;
      color: ${SUB_TEXT};
    }

    .totals-detail-value {
      font-size: 11px;
      color: ${SUB_TEXT};
    }

    .totals-total {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px solid ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .totals-amount {
      font-size: 24px;
      font-weight: bold;
      color: ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Bank Section === */
    .bank-section {
      margin-bottom: 32px;
    }

    .bank-detail {
      font-size: 13px;
      color: ${TEXT_COLOR};
      margin-bottom: 2px;
    }

    /* === Notes Section === */
    .notes-section {
      border-top: 1px solid ${DIVIDER};
      padding-top: 16px;
      margin-bottom: 24px;
    }

    .notes-title {
      font-size: 13px;
      font-weight: bold;
      color: ${SUB_TEXT};
      margin-bottom: 8px;
    }

    .notes-content {
      font-size: 13px;
      color: ${SUB_TEXT};
      white-space: pre-wrap;
      line-height: 1.7;
    }

    /* === Print === */
    @media print {
      body {
        padding: 30px 40px 30px 44px;
        border-left: 4px solid ${ACCENT};
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .document-container {
        max-width: none;
      }
    }
  `;
}

// === Main Template Generator ===

/**
 * Generate Modern template HTML
 *
 * 1-column flow layout with blue accent color.
 * Sequence: title -> meta -> client -> issuer -> table -> totals -> bank -> notes
 */
export function generateModernTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  // SPEC §5.1 / §7.2 hybrid pattern (FORMAL/ACCOUNTING/SIMPLE/CLASSIC と同 pattern):
  //   default 一致 → legacy DOM そのまま
  //   override   → block-by-block extraction + dual anchor grid (P4-C-5 MODERN)
  const isDefault = isDefaultResolvedPlacement(options.blockPlacements, 'MODERN');

  const labels = getDocumentLabels(doc.type);
  const sealSizePx = getSealSizePx(options.sealSize ?? DEFAULT_SEAL_SIZE, 'MODERN');
  const backgroundCss = getBackgroundCss(options.backgroundDesign, options.backgroundImageDataUrl);
  const backgroundHtml = getBackgroundHtml(options.backgroundDesign, options.backgroundImageDataUrl);
  const css = getModernCss(sealSizePx);

  // Sections (always)
  const titleHtml = `<h1 class="modern-title">${escapeHtml(labels.title)}</h1>`;
  const metaHtml = renderMeta(doc);
  const clientHtml = renderClient(doc);
  const tableHtml = renderLineItemsTable(doc);
  const totalsHtml = renderTotalsCard(doc);

  // Block placement decisions (legacy / override)
  let issuerHtml: string;
  let bankHtml: string;
  let notesHtml: string;
  let blockLayoutTopHtml = '';
  let blockLayoutBottomHtml = '';
  let overrideCss = '';

  if (isDefault) {
    issuerHtml = renderIssuer(doc, sensitiveSnapshot);
    bankHtml = labels.showBankInfo ? renderBankInfo(sensitiveSnapshot) : '';
    notesHtml = renderNotes(doc);
  } else {
    const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.MODERN;
    const perBlock = computePerBlockStatus(options.blockPlacements, templateDefault);

    issuerHtml = perBlock.companyStamp.isDefault
      ? renderIssuer(doc, sensitiveSnapshot)
      : renderIssuerInfoText(doc, sensitiveSnapshot);
    // bank: untouched-at-default なら legacy 位置に bank-section、moved/hidden なら省略
    bankHtml = perBlock.bankAccount.isDefault && labels.showBankInfo
      ? renderBankInfo(sensitiveSnapshot)
      : '';
    notesHtml = perBlock.remarks.isDefault ? renderNotes(doc) : '';

    // Grid placement: moved blocks → cells.
    // MODERN の bank-section は独立 div なので grid cell に直接置ける (table wrap 不要)
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

    blockLayoutTopHtml = topRegion ? `\n    ${topRegion}` : '';
    blockLayoutBottomHtml = bottomRegion ? `\n    ${bottomRegion}` : '';

    if (topRegion || bottomRegion) {
      overrideCss = `
    ${BLOCK_LAYOUT_GRID_CSS}`;
    }
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${css}
    ${backgroundCss}${overrideCss}
  </style>
</head>
<body>
  <div class="document-container">
    ${backgroundHtml}
    ${titleHtml}
    ${metaHtml}
    ${clientHtml}
    ${issuerHtml}${blockLayoutTopHtml}
    ${tableHtml}
    ${totalsHtml}${blockLayoutBottomHtml}
    ${bankHtml}
    ${notesHtml}
  </div>
</body>
</html>`;
}
