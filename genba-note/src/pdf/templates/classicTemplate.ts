/**
 * Classic Template (CLASSIC) - "和風クラシック"
 *
 * A traditional Japanese business document template with Mincho (明朝体) typeface,
 * monochrome color scheme, and full-width sequential layout.
 *
 * Design characteristics:
 * - Mincho font family for traditional Japanese aesthetic
 * - Double-line outer border on document container
 * - Full-width sequential layout (NO flexbox 2-column headers)
 * - Full-grid table with all cell borders
 * - Vermillion (#C41E3A) seal frame
 * - Double-line separators for title and total row
 * - "以下余白" row at end of items table
 *
 * Supports both estimate (見積書) and invoice (請求書) document types.
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
  formatTaxRate,
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

// === CSS Styles ===

function getClassicStyles(sealSizePx: number): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', 'Noto Serif JP', serif;
      font-size: 11px;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 30px 35px;
    }

    .document-container {
      max-width: 100%;
      margin: 0 auto;
      border: double 4px #000;
      padding: 30px 25px;
    }

    /* === Title Section === */
    .classic-title {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.5em;
      padding-bottom: 10px;
      border-bottom: double 3px #000;
      margin-bottom: 20px;
    }

    /* === Meta Section (right-aligned) === */
    .classic-meta {
      text-align: right;
      margin-bottom: 15px;
      font-size: 11px;
    }

    .classic-meta-row {
      margin-bottom: 3px;
    }

    .classic-meta-label {
      font-weight: bold;
    }

    /* === Client Section (left-aligned, full width) === */
    .classic-client {
      margin-bottom: 15px;
    }

    .classic-client-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .classic-client-address {
      font-size: 11px;
      color: #333;
      margin-bottom: 2px;
    }

    /* === Greeting === */
    .classic-greeting {
      font-size: 11px;
      margin-bottom: 15px;
    }

    /* === Issuer Section (right-aligned, full width) === */
    .classic-issuer {
      text-align: right;
      margin-bottom: 20px;
      font-size: 11px;
      line-height: 1.6;
    }

    .classic-issuer-company {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .classic-issuer-postal,
    .classic-issuer-address,
    .classic-issuer-tel,
    .classic-issuer-registration {
      margin-bottom: 2px;
    }

    .classic-issuer-registration {
      font-size: 10px;
      color: #333;
    }

    .classic-issuer-contact {
      margin-top: 4px;
    }

    /* === Seal (centered below issuer info) === */
    /* Legacy: classic-issuer 内の seal は右寄せ。Override branch で seal が grid cell に
       moved されたとき、cell の text-align を継承させたいため .classic-issuer 内に
       scope する (P4-C-3 ACCOUNTING / P4-C-4 SIMPLE と同 pattern)。 */
    .classic-issuer .classic-seal-container {
      display: flex;
      justify-content: flex-end;
      margin: 8px 0;
    }

    .classic-seal-frame {
      border: 1px solid #C41E3A;
      border-radius: 50%;
      padding: 3px;
      display: inline-block;
      line-height: 0;
      background: transparent;
    }

    .classic-seal-image {
      width: ${sealSizePx}px;
      height: ${sealSizePx}px;
      object-fit: contain;
      border-radius: 50%;
      opacity: 0.85;
      mix-blend-mode: multiply;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Info Block (full-width grid table) === */
    .classic-info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .classic-info-table td {
      border: 1px solid #333;
      padding: 6px 10px;
      font-size: 11px;
      vertical-align: top;
    }

    .classic-info-label {
      width: 100px;
      font-weight: bold;
    }

    .classic-info-value {
      /* remaining width */
    }

    /* === Items Table (full grid) === */
    .classic-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }

    .classic-items-table th {
      background: #f0f0f0;
      font-weight: bold;
      font-size: 10px;
      padding: 7px 8px;
      border: 1px solid #333;
      text-align: center;
    }

    .classic-items-table td {
      padding: 6px 8px;
      font-size: 10px;
      border: 1px solid #333;
    }

    .classic-items-table .col-name {
      width: 28%;
      text-align: left;
    }

    .classic-items-table .col-spec {
      width: 16%;
      text-align: left;
    }

    .classic-items-table .col-qty {
      width: 9%;
      text-align: right;
    }

    .classic-items-table .col-unit {
      width: 9%;
      text-align: center;
    }

    .classic-items-table .col-price {
      width: 17%;
      text-align: right;
    }

    .classic-items-table .col-total {
      width: 21%;
      text-align: right;
    }

    .classic-items-table .item-name {
      text-align: left;
    }

    .classic-items-table .item-spec {
      text-align: left;
    }

    .classic-items-table .item-qty {
      text-align: right;
    }

    .classic-items-table .item-unit {
      text-align: center;
    }

    .classic-items-table .item-price {
      text-align: right;
    }

    .classic-items-table .item-total {
      text-align: right;
    }

    /* "以下余白" row */
    .classic-items-table .blank-row td {
      text-align: center;
      color: #666;
      font-size: 10px;
      padding: 6px 8px;
    }

    /* === Totals (integrated into table area) === */
    .classic-totals-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .classic-totals-table td {
      padding: 6px 10px;
      font-size: 11px;
      border: 1px solid #333;
    }

    .classic-totals-table .totals-label {
      width: 45%;
      text-align: left;
      font-weight: bold;
    }

    .classic-totals-table .totals-value {
      text-align: right;
    }

    .classic-totals-table .total-row td {
      border-top: double 3px #000;
      font-weight: bold;
      font-size: 13px;
      padding: 8px 10px;
    }

    .classic-totals-table .tax-breakdown-row td {
      font-size: 10px;
      color: #333;
    }

    /* === Notes Section === */
    .classic-notes {
      margin-top: 20px;
      border: 2px solid #000;
    }

    .classic-notes-title {
      font-weight: bold;
      font-size: 11px;
      padding: 6px 10px;
      border-bottom: 1px solid #000;
    }

    .classic-notes-content {
      padding: 10px;
      font-size: 10px;
      white-space: pre-wrap;
      min-height: 40px;
    }

    /* === Print Styles === */
    @media print {
      body {
        padding: 15px;
      }
      .document-container {
        max-width: none;
      }
    }
  `;
}

// === Section Renderers ===

/**
 * Render the title with "御" prefix and double underline
 */
function renderTitle(doc: DocumentWithTotals): string {
  const title = doc.type === 'estimate' ? '御見積書' : '御請求書';
  return `<div class="classic-title">${title}</div>`;
}

/**
 * Render meta info (date, document number) right-aligned
 */
function renderMeta(doc: DocumentWithTotals): string {
  const labels = getDocumentLabels(doc.type);
  return `
    <div class="classic-meta">
      <div class="classic-meta-row">
        <span class="classic-meta-label">${escapeHtml(labels.dateLabel)}:</span> ${formatDate(doc.issueDate)}
      </div>
      <div class="classic-meta-row">
        <span class="classic-meta-label">${escapeHtml(labels.numberLabel)}:</span> ${escapeHtml(doc.documentNo)}
      </div>
    </div>
  `;
}

/**
 * Render client section (left-aligned, full width) with "御中"
 */
function renderClient(doc: DocumentWithTotals): string {
  const addressHtml = doc.clientAddress
    ? `<div class="classic-client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';
  return `
    <div class="classic-client">
      <div class="classic-client-name">${escapeHtml(doc.clientName)} 御中</div>
      ${addressHtml}
    </div>
  `;
}

/**
 * Render greeting text
 */
function renderGreeting(doc: DocumentWithTotals): string {
  const labels = getDocumentLabels(doc.type);
  return `<div class="classic-greeting">${escapeHtml(labels.greeting)}</div>`;
}

// === Fragment primitives (P4-C-4 CLASSIC, SPEC §7.2.5) ===
// FORMAL/ACCOUNTING/SIMPLE と同 pattern。CLASSIC の特徴は seal が
// `<div class="classic-seal-container">` 入れ子 (vermilion frame) で line array
// に inline 挿入される点と、bank が `<tr>` (table-row、ACCOUNTING と類似) な点。

/**
 * Seal 単独 fragment (CLASSIC は vermilion frame 入れ子) — SPEC §7.2.5。
 */
function renderSealFragment(issuerSnapshot: IssuerSnapshot): string {
  if (!isValidImageDataUri(issuerSnapshot.sealImageBase64)) return '';
  return `
      <div class="classic-seal-container">
        <div class="classic-seal-frame">
          <img src="${issuerSnapshot.sealImageBase64}" alt="印影" class="classic-seal-image" />
        </div>
      </div>
    `;
}

/**
 * Bank info 単独 fragment (table-row level、`<tr>...</tr>`) — SPEC §7.2.5。
 *
 * **legacy 合成専用**。**override 経路で grid cell に投入する場合は
 * `renderBankBlockForCell()`** で `<table class="classic-info-table">` ラップ。
 * (P4-C-3 ACCOUNTING と同 pattern: bare `<tr>` を `<div>` 内に置けない)
 */
function renderBankFragment(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  if (!hasBankInfo(sensitiveSnapshot)) return '';

  const bankLines: string[] = [];
  if (sensitiveSnapshot!.bankName) {
    let bankLine = escapeHtml(sensitiveSnapshot!.bankName);
    if (sensitiveSnapshot!.branchName) {
      bankLine += ` ${escapeHtml(sensitiveSnapshot!.branchName)}`;
    }
    if (sensitiveSnapshot!.accountType) {
      bankLine += ` ${escapeHtml(sensitiveSnapshot!.accountType)}`;
    }
    if (sensitiveSnapshot!.accountNumber) {
      bankLine += ` ${escapeHtml(sensitiveSnapshot!.accountNumber)}`;
    }
    bankLines.push(bankLine);
  }
  if (sensitiveSnapshot!.accountHolderName) {
    bankLines.push(escapeHtml(sensitiveSnapshot!.accountHolderName));
  }

  return `
      <tr>
        <td class="classic-info-label">振込先</td>
        <td class="classic-info-value">${bankLines.join('<br>')}</td>
      </tr>
    `;
}

/**
 * Notes 単独 fragment — SPEC §7.2.5。
 * CLASSIC は notes が空でも wrapper を出す (FORMAL/ACCOUNTING と同じ、SIMPLE と異なる)。
 */
function renderNotesFragment(doc: DocumentWithTotals): string {
  return `
    <div class="classic-notes">
      <div class="classic-notes-title">備考</div>
      <div class="classic-notes-content">${doc.notes ? escapeHtml(doc.notes) : ''}</div>
    </div>
  `;
}

/**
 * Build issuer info lines. CLASSIC の seal は classic-issuer 内に inline push
 * (vermilion frame 入れ子)、includeSeal フラグで切替 (P4-C-3/P4-C-4 SIMPLE と同 pattern)。
 *
 * line order: companyName → postal → address1 → address2 → tel → [seal] →
 *             registration → contact
 */
function buildIssuerInfoLines(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeSeal: boolean
): string[] {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);
  const lines: string[] = [];

  if (issuerSnapshot.companyName) {
    lines.push(`<div class="classic-issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }

  const parsedAddress = parseAddressWithPostalCode(issuerSnapshot.address);
  if (parsedAddress.postalCode) {
    lines.push(`<div class="classic-issuer-postal">${escapeHtml(parsedAddress.postalCode)}</div>`);
  }
  if (parsedAddress.addressLine1) {
    lines.push(`<div class="classic-issuer-address">${escapeHtml(parsedAddress.addressLine1)}</div>`);
  }
  if (parsedAddress.addressLine2) {
    lines.push(`<div class="classic-issuer-address">${escapeHtml(parsedAddress.addressLine2)}</div>`);
  }

  if (issuerSnapshot.phone) {
    lines.push(`<div class="classic-issuer-tel">TEL: ${escapeHtml(issuerSnapshot.phone)}</div>`);
  }

  if (includeSeal) {
    const sealHtml = renderSealFragment(issuerSnapshot);
    if (sealHtml) {
      lines.push(sealHtml);
    }
  }

  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    lines.push(`<div class="classic-issuer-registration">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  if (issuerSnapshot.contactPerson) {
    lines.push(`<div class="classic-issuer-contact">担当: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  return lines;
}

/**
 * Issuer info text (seal を含まない classic-issuer) — SPEC §7.2.5。
 * override 経路で seal が moved/hidden の時 header 相当を seal なしで出力。
 */
function renderIssuerInfoText(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot, /*includeSeal=*/false);
  if (lines.length === 0) return '';
  return `
    <div class="classic-issuer">
      ${lines.join('\n')}
    </div>
  `;
}

/**
 * Render issuer section (right-aligned, full width) — legacy composition.
 * Seal is centered below issuer info with vermillion frame.
 *
 * sealSizePx は CSS 経由で適用されるため引数として保持しない (legacy/override
 * 共通 primitive を呼ぶ薄ラッパーに統一)。
 */
function renderIssuer(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot, /*includeSeal=*/true);
  if (lines.length === 0) return '';
  return `
    <div class="classic-issuer">
      ${lines.join('\n')}
    </div>
  `;
}

/**
 * info-block table の rows 構築 — SPEC §7.2.5。
 */
function renderInfoBlockRows(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeBank: boolean
): string {
  const labels = getDocumentLabels(doc.type);
  const rows: string[] = [];

  if (doc.subject) {
    rows.push(`
      <tr>
        <td class="classic-info-label">件名</td>
        <td class="classic-info-value">${escapeHtml(doc.subject)}</td>
      </tr>
    `);
  }

  const periodValue = doc[labels.periodField];
  if (periodValue) {
    rows.push(`
      <tr>
        <td class="classic-info-label">${escapeHtml(labels.periodLabel)}</td>
        <td class="classic-info-value">${formatDate(periodValue)}</td>
      </tr>
    `);
  }

  if (includeBank && labels.showBankInfo) {
    const bankRow = renderBankFragment(sensitiveSnapshot);
    if (bankRow) rows.push(bankRow);
  }

  return rows.join('');
}

/**
 * Wrap rows with `<table class="classic-info-table">` — legacy / override 共通 wrapper。
 */
function renderInfoBlockFromRows(rowsHtml: string): string {
  if (rowsHtml === '') return '';
  return `
    <table class="classic-info-table">
      ${rowsHtml}
    </table>
  `;
}

/**
 * Render info block table (subject, period, bank info) — legacy composition.
 */
function renderInfoBlock(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const rowsHtml = renderInfoBlockRows(doc, sensitiveSnapshot, /*includeBank=*/true);
  return renderInfoBlockFromRows(rowsHtml);
}

/**
 * Bank fragment を grid cell に投入するためのラッピング helper。
 * `<table class="classic-info-table">` で包み HTML 構造的妥当性を確保
 * (P4-C-3 ACCOUNTING の同名 helper と同 pattern)。
 */
function renderBankBlockForCell(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  const bankRow = renderBankFragment(sensitiveSnapshot);
  return renderInfoBlockFromRows(bankRow);
}

/**
 * Render line items table with full grid borders
 * Includes "以下余白" row at the end
 */
function renderLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    return `
      <tr>
        <td class="item-name">${escapeHtml(item.name)}</td>
        <td class="item-spec">${escapeHtml(item.spec ?? '')}</td>
        <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
        <td class="item-unit">${escapeHtml(item.unit)}</td>
        <td class="item-price">${formatCurrency(item.unitPrice)}</td>
        <td class="item-total">${formatCurrency(item.subtotal)}</td>
      </tr>
    `;
  });

  return `
    <table class="classic-items-table">
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
        ${rows.join('')}
        <tr class="blank-row">
          <td colspan="6">以下余白</td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Render totals section integrated into table area
 * Total row uses double-line separator
 */
function renderTotalsSection(doc: DocumentWithTotals): string {
  const rows: string[] = [];

  // Subtotal (tax-exclusive)
  rows.push(`
    <tr>
      <td class="totals-label">小計（税抜）</td>
      <td class="totals-value">${formatCurrency(doc.subtotalYen)}円</td>
    </tr>
  `);

  // Tax breakdown
  doc.taxBreakdown.forEach((tb) => {
    const rateLabel = tb.rate === 0 ? '非課税' : `消費税(${tb.rate}%)`;
    rows.push(`
      <tr class="tax-breakdown-row">
        <td class="totals-label">${rateLabel}</td>
        <td class="totals-value">${formatCurrency(tb.tax)}円</td>
      </tr>
    `);
  });

  // Carried forward (if any)
  const carriedForward = doc.carriedForwardAmount ?? 0;
  if (carriedForward > 0) {
    rows.push(`
      <tr>
        <td class="totals-label">繰越金額</td>
        <td class="totals-value">${formatCurrency(carriedForward)}円</td>
      </tr>
    `);
  }

  // Grand total with double-line separator
  rows.push(`
    <tr class="total-row">
      <td class="totals-label">合計（税込）</td>
      <td class="totals-value">${formatCurrency(doc.totalYen)}円</td>
    </tr>
  `);

  return `
    <table class="classic-totals-table">
      ${rows.join('')}
    </table>
  `;
}

/**
 * Render notes section with thick border and Mincho bold title — legacy composition.
 *
 * Delegates to renderNotesFragment so the box markup is shared with override
 * branch. CLASSIC は notes 空でも wrapper を出す legacy 挙動を保持。
 */
function renderNotesSection(doc: DocumentWithTotals): string {
  return renderNotesFragment(doc);
}

// === Main Template Generator ===

/**
 * Generate CLASSIC template HTML
 *
 * Creates a traditional Japanese "和風クラシック" document with Mincho typeface,
 * monochrome design, double-line borders, and full-grid table layout.
 *
 * @param doc - Document with calculated totals
 * @param sensitiveSnapshot - Sensitive issuer information (bank account, etc.)
 * @param options - Template options (seal size, background design)
 * @returns Complete HTML string for the document
 */
export function generateClassicTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  // SPEC §5.1 / §7.2 hybrid pattern (FORMAL / ACCOUNTING / SIMPLE と同 pattern):
  //   default 一致 → legacy DOM そのまま
  //   override   → block-by-block extraction + dual anchor grid (P4-C-4 CLASSIC)
  const isDefault = isDefaultResolvedPlacement(options.blockPlacements, 'CLASSIC');

  const sealSizePx = getSealSizePx(options.sealSize ?? DEFAULT_SEAL_SIZE, 'CLASSIC');
  const backgroundCss = getBackgroundCss(options.backgroundDesign, options.backgroundImageDataUrl);
  const backgroundHtml = getBackgroundHtml(options.backgroundDesign, options.backgroundImageDataUrl);
  const labels = getDocumentLabels(doc.type);

  let issuerHtml: string;
  let infoBlockHtml: string;
  let notesHtml: string;
  let blockLayoutTopHtml = '';
  let blockLayoutBottomHtml = '';
  let overrideCss = '';

  if (isDefault) {
    issuerHtml = renderIssuer(doc, sensitiveSnapshot);
    infoBlockHtml = renderInfoBlock(doc, sensitiveSnapshot);
    notesHtml = renderNotesSection(doc);
  } else {
    const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.CLASSIC;
    const perBlock = computePerBlockStatus(options.blockPlacements, templateDefault);

    issuerHtml = perBlock.companyStamp.isDefault
      ? renderIssuer(doc, sensitiveSnapshot)
      : renderIssuerInfoText(doc, sensitiveSnapshot);
    const rowsHtml = renderInfoBlockRows(
      doc,
      sensitiveSnapshot,
      /*includeBank=*/perBlock.bankAccount.isDefault
    );
    infoBlockHtml = renderInfoBlockFromRows(rowsHtml);
    notesHtml = perBlock.remarks.isDefault ? renderNotesSection(doc) : '';

    // Grid placement: moved blocks → cells. bank は table wrapper 必須。
    const renderedBlocks: RenderedBlocks = {
      bankAccount: !perBlock.bankAccount.isDefault && labels.showBankInfo
        ? renderBankBlockForCell(sensitiveSnapshot)
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
    ${getClassicStyles(sealSizePx)}
    ${backgroundCss}${overrideCss}
  </style>
</head>
<body>
  <div class="document-container">
    ${backgroundHtml}
    <!-- Title with "御" prefix and double underline -->
    ${renderTitle(doc)}

    <!-- Meta info (right-aligned): date, document number -->
    ${renderMeta(doc)}

    <!-- Client name (left-aligned, full width) -->
    ${renderClient(doc)}

    <!-- Greeting text -->
    ${renderGreeting(doc)}

    <!-- Issuer info (right-aligned, full width) with seal -->
    ${issuerHtml}${blockLayoutTopHtml}

    <!-- Info block (subject, period, bank info) -->
    ${infoBlockHtml}

    <!-- Line items table (full grid) -->
    ${renderLineItemsTable(doc)}

    <!-- Totals section -->
    ${renderTotalsSection(doc)}${blockLayoutBottomHtml}

    <!-- Notes section -->
    ${notesHtml}
  </div>
</body>
</html>`;
}
