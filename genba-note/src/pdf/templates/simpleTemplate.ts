/**
 * Simple Template (SIMPLE) - "シンプル・ミニマル"
 *
 * A clean, minimal PDF template adapted for both estimate and invoice documents.
 *
 * Design characteristics:
 * - Gothic (sans-serif) font family
 * - Seal is SMALL (50px for MEDIUM via getSealSizePx)
 * - Table header is #333 (dark gray, NOT #000 black)
 * - Notes are BORDERLESS with just a top line (M21 change)
 * - 2-column header: left client, right meta + issuer
 * - Issuer block is vertical stack (seal BELOW phone, not beside)
 * - Info block with black labels (background: #000, color: #fff)
 * - Grand total: 2-tone black label + white amount
 *
 * Supports both estimate (見積書) and invoice (請求書) document types.
 */

import type { DocumentWithTotals, IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';
import type { TemplateOptions } from './templateRegistry';
import { getSealSizePx, DEFAULT_SEAL_SIZE } from '@/pdf/types';
import { FORMAL_COLORS } from '@/pdf/types';
import { getBackgroundCss, getBackgroundHtml } from '@/pdf/backgroundDesigns';
import { getFormalThemeCss } from '@/pdf/themes';
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

function getSimpleStyles(sealSizePx: number): string {
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
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .document-container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* === Title === */
    .simple-title {
      font-size: 26px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.2em;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 25px;
    }

    /* === Two-column header === */
    .simple-header {
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

    /* === Meta info (No, date) === */
    .header-meta {
      margin-bottom: 15px;
    }

    .meta-row {
      margin-bottom: 4px;
    }

    .meta-label {
      font-weight: bold;
    }

    /* === Client section (left column) === */
    .simple-client-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .simple-client-name::after {
      content: ' 御中';
      font-weight: normal;
    }

    .client-address {
      font-size: 12px;
      color: #333;
      margin-bottom: 2px;
    }

    .greeting-text {
      font-size: 12px;
      margin-top: 15px;
    }

    /* === Issuer block (vertical stack, seal BELOW phone) === */
    .issuer-block {
      text-align: right;
    }

    .issuer-info {
      text-align: right;
    }

    .issuer-company {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issuer-postal {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .issuer-address-line {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .issuer-tel {
      font-size: 11px;
      margin-bottom: 2px;
    }

    /* Seal image positioned below phone number (legacy: inside issuer-block).
       Override branch で seal が grid cell に moved されたとき cell の text-align を
       継承させたいため、.issuer-block に scope する (P4-C-3 と同 pattern)。 */
    .issuer-block .issuer-seal {
      text-align: right;
      margin: 8px 0;
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

    /* Contact person (separate from seal) */
    .issuer-contact {
      font-size: 11px;
      margin-top: 4px;
    }

    /* === Info block with black labels === */
    .info-block {
      border: 1px solid #000;
      margin: 20px 0;
    }

    .info-row {
      display: flex;
      border-bottom: 1px solid #ccc;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      width: 100px;
      font-weight: bold;
      font-size: 11px;
      flex-shrink: 0;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .info-value {
      padding: 8px 12px;
      flex: 1;
      font-size: 12px;
      white-space: pre-wrap;
    }

    /* === Grand total block (2-tone: black label + white amount) === */
    .grand-total-block {
      display: flex;
      border: 2px solid #000;
      margin: 20px 0;
      width: auto;
    }

    .grand-total-label {
      background: #000;
      color: #fff;
      padding: 15px 25px;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .grand-total-value {
      flex: 1;
      padding: 15px 25px;
      text-align: right;
      font-size: 24px;
      font-weight: bold;
      border-left: 2px solid #000;
    }

    /* === Carried forward block (same 2-tone, thinner border) === */
    .carried-forward-block {
      display: flex;
      border: 1px solid #000;
      margin: 15px 0;
    }

    .cf-label {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .cf-value {
      flex: 1;
      padding: 8px 12px;
      text-align: right;
      font-size: 14px;
      font-weight: bold;
      background: #fff;
      border-left: 1px solid #000;
    }

    /* === Line items table (header: #333 dark gray) === */
    .simple-items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .simple-items-table th {
      background: #333;
      color: #fff;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      font-size: 11px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .simple-items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #ccc;
      font-size: 11px;
    }

    .simple-items-table tr:nth-child(even) {
      background: #f5f5f5;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .simple-items-table .col-name { width: 45%; }
    .simple-items-table .col-qty { width: 10%; text-align: right; }
    .simple-items-table .col-unit { width: 10%; text-align: center; }
    .simple-items-table .col-price { width: 15%; text-align: right; }
    .simple-items-table .col-total { width: 20%; text-align: right; }

    .simple-items-table .item-qty,
    .simple-items-table .item-price,
    .simple-items-table .item-total { text-align: right; }
    .simple-items-table .item-unit { text-align: center; }

    /* === Totals section (right-aligned with dotted borders) === */
    .simple-totals-section {
      display: flex;
      justify-content: flex-end;
      margin: 20px 0;
    }

    .simple-totals-table {
      border-collapse: collapse;
      min-width: 250px;
    }

    .simple-totals-table td {
      padding: 6px 12px;
      font-size: 12px;
    }

    .simple-totals-table .totals-label {
      text-align: left;
      border-right: 1px solid #ccc;
    }

    .simple-totals-table .totals-value {
      text-align: right;
    }

    .simple-totals-table tr {
      border-bottom: 1px dotted #999;
    }

    .simple-totals-table .carried-forward-row td {
      color: #666;
    }

    .simple-totals-table .tax-breakdown-row td {
      font-size: 10px;
      color: #666;
      padding: 3px 12px;
    }

    .simple-totals-table .tax-rate-label {
      padding-left: 20px;
    }

    .simple-totals-table .total-final-row {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      background: #f5f5f5;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .simple-totals-table .total-final-row td {
      font-weight: bold;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    .simple-totals-table .total-final-label {
      font-size: 13px;
    }

    .simple-totals-table .total-final-value {
      font-size: 16px;
      color: #000;
    }

    /* === Notes section (M21 CHANGE: borderless with top line only) === */
    .simple-notes-section {
      margin: 25px 0;
      padding-top: 15px;
      border-top: 1px solid #ccc;
    }

    .simple-notes-section .notes-title {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .simple-notes-section .notes-content {
      padding: 0;
      font-size: 11px;
      white-space: pre-wrap;
    }

    /* === Print === */
    @media print {
      body {
        padding: 20px;
      }
      .document-container {
        max-width: none;
      }
    }
  `;
}

// === Section Renderers ===

// === Fragment primitives (P4-C-4 SIMPLE, SPEC §7.2.5) ===
// FORMAL/ACCOUNTING で確立した pattern を SIMPLE に適用。
// SIMPLE は seal が issuer-block 内 inline 挿入 (ACCOUNTING と類似)、bank が
// `<div class="info-row">` (FORMAL は info-box-row、ACCOUNTING は <tr>)。

/**
 * Seal 単独 fragment — SPEC §7.2.5。issuerSnapshot のみ参照。
 */
function renderSealFragment(issuerSnapshot: IssuerSnapshot): string {
  const hasSeal = isValidImageDataUri(issuerSnapshot.sealImageBase64);
  if (!hasSeal) return '';
  return `<div class="issuer-seal"><img src="${issuerSnapshot.sealImageBase64}" alt="印影" class="seal-image" /></div>`;
}

/**
 * Bank info 単独 fragment (info-row level、`<div class="info-row">`) — SPEC §7.2.5。
 *
 * **legacy 合成専用**: info-block 内の rows の一つとして組み立てる。
 * **override 経路で grid cell に投入する場合は `renderBankBlockForCell()` を使う**:
 *   info-block の枠 (border: 1px solid #000) を保ち visual 一貫性を確保するため、
 *   bare `<div class="info-row">` ではなく info-block wrapper つきで投入する
 *   (ACCOUNTING の renderBankBlockForCell pattern と同様)。
 */
function renderBankFragment(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  if (!hasBankInfo(sensitiveSnapshot)) return '';

  const parts: string[] = [];
  if (sensitiveSnapshot!.bankName) parts.push(escapeHtml(sensitiveSnapshot!.bankName));
  if (sensitiveSnapshot!.branchName) parts.push(`${escapeHtml(sensitiveSnapshot!.branchName)}支店`);
  if (sensitiveSnapshot!.accountType) parts.push(escapeHtml(sensitiveSnapshot!.accountType));
  if (sensitiveSnapshot!.accountNumber) parts.push(escapeHtml(sensitiveSnapshot!.accountNumber));
  if (sensitiveSnapshot!.accountHolderName) parts.push(escapeHtml(sensitiveSnapshot!.accountHolderName));

  return `
      <div class="info-row">
        <div class="info-label">振込先</div>
        <div class="info-value">${parts.join(' ')}</div>
      </div>`;
}

/**
 * Notes 単独 fragment — SPEC §7.2.5。
 *
 * SIMPLE は doc.notes が空なら空文字を返す legacy 挙動を保持
 * (FORMAL/ACCOUNTING は wrapper を残すが、SIMPLE は出さない)。
 */
function renderNotesFragment(doc: DocumentWithTotals): string {
  if (!doc.notes) return '';
  return `
    <div class="simple-notes-section">
      <div class="notes-title">備考</div>
      <div class="notes-content">${escapeHtml(doc.notes)}</div>
    </div>
  `;
}

/**
 * info-block の rows 構築 (bank を含むかフラグで切替) — SPEC §7.2.5。
 *
 * legacy は includeBank=true、override で bank moved/hidden は includeBank=false。
 */
function renderInfoBlockRows(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeBank: boolean
): string {
  const labels = getDocumentLabels(doc.type);
  const rows: string[] = [];

  // Subject
  if (doc.subject) {
    rows.push(`
      <div class="info-row">
        <div class="info-label">件名</div>
        <div class="info-value">${escapeHtml(doc.subject)}</div>
      </div>`);
  }

  // Period (validUntil for estimate, dueDate for invoice)
  const periodValue = doc[labels.periodField];
  if (periodValue) {
    rows.push(`
      <div class="info-row">
        <div class="info-label">${escapeHtml(labels.periodLabel)}</div>
        <div class="info-value">${formatDate(periodValue)}</div>
      </div>`);
  }

  // Bank info (invoice only, gated by includeBank)
  if (includeBank && labels.showBankInfo) {
    const bankRow = renderBankFragment(sensitiveSnapshot);
    if (bankRow) rows.push(bankRow);
  }

  return rows.join('');
}

/**
 * Wrap rows with `<div class="info-block">` — legacy / override 共通 wrapper。
 * 空 rows の場合 wrapper も省略。whitespace を完全一致させるため共通 helper 経由。
 */
function renderInfoBlockFromRows(rowsHtml: string): string {
  if (rowsHtml === '') return '';
  return `
    <div class="info-block">
      ${rowsHtml}
    </div>
  `;
}

/**
 * Render info block — legacy composition.
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
 *
 * info-block の枠 (border: 1px solid #000) で wrap し visual 一貫性を確保する
 * (P4-C-3 ACCOUNTING の同名 helper と同 pattern)。
 */
function renderBankBlockForCell(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  const bankRow = renderBankFragment(sensitiveSnapshot);
  return renderInfoBlockFromRows(bankRow);
}

/**
 * Render grand total block (2-tone: black label + white amount)
 */
function renderGrandTotalBlock(doc: DocumentWithTotals): string {
  return `
    <div class="grand-total-block">
      <div class="grand-total-label">合計（税込）</div>
      <div class="grand-total-value">${formatCurrency(doc.totalYen)}円</div>
    </div>
  `;
}

/**
 * Render carried forward block (same 2-tone style, thinner border)
 * Only shown when carriedForwardAmount > 0
 */
function renderCarriedForwardBlock(doc: DocumentWithTotals): string {
  const carriedForward = doc.carriedForwardAmount ?? 0;
  if (carriedForward <= 0) {
    return '';
  }

  return `
    <div class="carried-forward-block">
      <div class="cf-label">繰越金額</div>
      <div class="cf-value">${formatCurrency(carriedForward)}円</div>
    </div>
  `;
}

/**
 * Build issuer info lines. SIMPLE の seal は issuer-block 内に inline 挿入される
 * 構造のため、includeSeal フラグで seal 行を含めるかを制御する (ACCOUNTING と
 * 同 pattern)。line order: companyName → postal → address1 → address2 → tel →
 * [seal] → registration → contact。
 */
function buildIssuerInfoLines(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeSeal: boolean
): string[] {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);

  const infoLines: string[] = [];

  // Company name
  if (issuerSnapshot.companyName) {
    infoLines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }

  // Parse address into postal code and lines
  const parsedAddress = parseAddressWithPostalCode(issuerSnapshot.address);
  if (parsedAddress.postalCode) {
    infoLines.push(`<div class="issuer-postal">${escapeHtml(parsedAddress.postalCode)}</div>`);
  }
  if (parsedAddress.addressLine1) {
    infoLines.push(`<div class="issuer-address-line">${escapeHtml(parsedAddress.addressLine1)}</div>`);
  }
  if (parsedAddress.addressLine2) {
    infoLines.push(`<div class="issuer-address-line">${escapeHtml(parsedAddress.addressLine2)}</div>`);
  }

  // TEL (no FAX for simple template)
  if (issuerSnapshot.phone) {
    infoLines.push(`<div class="issuer-tel">TEL: ${escapeHtml(issuerSnapshot.phone)}</div>`);
  }

  // Seal image (placed below phone number) — flagged for override branch
  if (includeSeal) {
    const sealHtml = renderSealFragment(issuerSnapshot);
    if (sealHtml) {
      infoLines.push(sealHtml);
    }
  }

  // Registration number (invoice only)
  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    infoLines.push(`<div class="issuer-registration" style="font-size:11px;margin-bottom:2px;">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  // Contact person (below seal)
  if (issuerSnapshot.contactPerson) {
    infoLines.push(`<div class="issuer-contact">担当: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  return infoLines;
}

/**
 * Issuer info text (seal を含まない issuer-block) — SPEC §7.2.5。
 * override 経路で seal が moved されたとき header 相当部分を seal なしで
 * レンダリングするための primitive。
 */
function renderIssuerInfoText(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot, /*includeSeal=*/false);
  if (lines.length === 0) return '';
  return `
    <div class="issuer-block">
      <div class="issuer-info">
        ${lines.join('\n        ')}
      </div>
    </div>
  `;
}

/**
 * Render issuer block (vertical stack, seal BELOW phone number) — legacy composition.
 *
 * sealSizePx は CSS 経由で適用されるため引数として保持しない (本 helper は
 * legacy/override 共通の primitive を呼ぶ薄ラッパーに統一)。
 */
function renderIssuerBlock(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot, /*includeSeal=*/true);
  if (lines.length === 0) return '';
  return `
    <div class="issuer-block">
      <div class="issuer-info">
        ${lines.join('\n        ')}
      </div>
    </div>
  `;
}

/**
 * Render line items table (header: #333 dark gray)
 * Columns: 摘要 | 数量 | 単位 | 単価（税抜）| 金額（税抜）
 */
function renderLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}円</td>
          <td class="item-total">${formatCurrency(item.subtotal)}円</td>
        </tr>`;
  });

  return `
    <table class="simple-items-table">
      <thead>
        <tr>
          <th class="col-name">摘要</th>
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
 * Render totals section (right-aligned with dotted borders)
 * Includes tax breakdown rows
 */
function renderTotalsSection(doc: DocumentWithTotals): string {
  const carriedForward = doc.carriedForwardAmount ?? 0;
  const hasCarriedForward = carriedForward > 0;

  const carriedForwardRow = hasCarriedForward
    ? `
        <tr class="carried-forward-row">
          <td class="totals-label">繰越金額</td>
          <td class="totals-value">${formatCurrency(carriedForward)}円</td>
        </tr>`
    : '';

  // Tax breakdown rows (show only non-zero tax amounts)
  const taxBreakdownRows = doc.taxBreakdown
    .filter((tb) => tb.tax > 0)
    .map((tb) => {
      const rateLabel = tb.rate === 0 ? '非課税' : `${tb.rate}%`;
      return `
        <tr class="tax-breakdown-row">
          <td class="totals-label tax-rate-label">　消費税(${rateLabel})</td>
          <td class="totals-value">${formatCurrency(tb.tax)}円</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="simple-totals-section">
      <table class="simple-totals-table">
        <tr>
          <td class="totals-label">小計（税抜）</td>
          <td class="totals-value">${formatCurrency(doc.subtotalYen)}円</td>
        </tr>
        <tr class="tax-total-row">
          <td class="totals-label">消費税</td>
          <td class="totals-value">${formatCurrency(doc.taxYen)}円</td>
        </tr>
        ${taxBreakdownRows}${carriedForwardRow}
        <tr class="total-final-row">
          <td class="totals-label total-final-label">合計（税込）</td>
          <td class="totals-value total-final-value">${formatCurrency(doc.totalYen)}円</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Render notes section (M21 CHANGE: borderless with top line only) — legacy composition.
 *
 * SIMPLE は doc.notes が空なら空文字を返す legacy 挙動を保持
 * (FORMAL/ACCOUNTING は wrapper を残すが、SIMPLE は出さない)。
 * Internally delegates to renderNotesFragment to share the box markup.
 */
function renderNotesSection(doc: DocumentWithTotals): string {
  return renderNotesFragment(doc);
}

// === Main Template Generator ===

/**
 * Generate SIMPLE template HTML
 *
 * Creates a clean, minimal document adapted for both estimate and invoice.
 * 2-column header layout with vertical-stack issuer block.
 *
 * @param doc - Document with calculated totals
 * @param sensitiveSnapshot - Sensitive issuer information (bank account, etc.)
 * @param options - Template options (seal size, background design)
 * @returns Complete HTML string for the document
 */
export function generateSimpleTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  // SPEC §5.1 / §7.2 hybrid pattern (FORMAL_STANDARD / ACCOUNTING と同 pattern):
  //   default 一致 → legacy DOM そのまま (旧コード完全実行、pixel diff 0 を保証)
  //   override   → block-by-block extraction + dual anchor grid (P4-C-4 SIMPLE)
  const isDefault = isDefaultResolvedPlacement(options.blockPlacements, 'SIMPLE');

  const labels = getDocumentLabels(doc.type);
  const sealSizePx = getSealSizePx(options.sealSize ?? DEFAULT_SEAL_SIZE, 'SIMPLE');
  const backgroundCss = getBackgroundCss(options.backgroundDesign, options.backgroundImageDataUrl);
  const backgroundHtml = getBackgroundHtml(options.backgroundDesign, options.backgroundImageDataUrl);
  const themeCss = getFormalThemeCss(FORMAL_COLORS);

  // Title with full-width spaces
  const title = doc.type === 'estimate' ? '見　積　書' : '請　求　書';

  // Greeting text
  const greeting = doc.type === 'estimate'
    ? '下記のとおり、御見積申し上げます。'
    : '下記のとおり、御請求申し上げます。';

  // Client address
  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  // === Block placement decisions (legacy / override) ===
  let issuerHtml: string;
  let infoBlockHtml: string;
  let notesHtml: string;
  let blockLayoutTopHtml = '';
  let blockLayoutBottomHtml = '';
  let overrideCss = '';

  if (isDefault) {
    issuerHtml = renderIssuerBlock(doc, sensitiveSnapshot);
    infoBlockHtml = renderInfoBlock(doc, sensitiveSnapshot);
    notesHtml = renderNotesSection(doc);
  } else {
    const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.SIMPLE;
    const perBlock = computePerBlockStatus(options.blockPlacements, templateDefault);

    // Legacy positions: untouched-at-default block は legacy DOM 内にそのまま残す。
    issuerHtml = perBlock.companyStamp.isDefault
      ? renderIssuerBlock(doc, sensitiveSnapshot)
      : renderIssuerInfoText(doc, sensitiveSnapshot);
    const rowsHtml = renderInfoBlockRows(
      doc,
      sensitiveSnapshot,
      /*includeBank=*/perBlock.bankAccount.isDefault
    );
    infoBlockHtml = renderInfoBlockFromRows(rowsHtml);
    notesHtml = perBlock.remarks.isDefault ? renderNotesSection(doc) : '';

    // Grid placement: moved block (isDefault=false かつ position !== 'hidden') のみ
    // grid セルへ。bank は renderBankBlockForCell で info-block 枠付き wrap。
    // estimate では showBankInfo=false で bank fragment 常に空。
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

  const carriedForwardHtml = renderCarriedForwardBlock(doc);
  const grandTotalHtml = renderGrandTotalBlock(doc);
  const lineItemsTableHtml = renderLineItemsTable(doc);
  const totalsHtml = renderTotalsSection(doc);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getSimpleStyles(sealSizePx)}
    ${themeCss}
    ${backgroundCss}${overrideCss}
  </style>
</head>
<body>
  <div class="document-container">
    ${backgroundHtml}
    <!-- Title -->
    <div class="simple-title">${title}</div>

    <!-- Two-column header -->
    <div class="simple-header">
      <div class="header-left">
        <div class="simple-client-name">${escapeHtml(doc.clientName)}</div>
        ${clientAddressHtml}
        <div class="greeting-text">${escapeHtml(greeting)}</div>
      </div>
      <div class="header-right">
        <div class="header-meta">
          <div class="meta-row"><span class="meta-label">${escapeHtml(labels.numberLabel)}:</span> ${escapeHtml(doc.documentNo)}</div>
          <div class="meta-row"><span class="meta-label">${escapeHtml(labels.dateLabel)}:</span> ${formatDate(doc.issueDate)}</div>
        </div>
        ${issuerHtml}
      </div>
    </div>${blockLayoutTopHtml}

    <!-- Info block (subject, period, bank info) -->
    ${infoBlockHtml}

    <!-- Grand total -->
    ${grandTotalHtml}

    <!-- Carried forward -->
    ${carriedForwardHtml}

    <!-- Line items -->
    ${lineItemsTableHtml}

    <!-- Totals -->
    ${totalsHtml}${blockLayoutBottomHtml}

    <!-- Notes -->
    ${notesHtml}
  </div>
</body>
</html>`;
}
