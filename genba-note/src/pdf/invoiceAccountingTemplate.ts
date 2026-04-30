/**
 * Invoice Accounting Template
 *
 * Accounting-style invoice PDF template for traditional Japanese business documents.
 * Redesigned to meet formal accounting requirements with black-label styling.
 *
 * Layout structure (top to bottom):
 * 1. Title: 請　求　書 (centered, underlined) + Meta info (No, date)
 * 2. Issuer section (standalone, right-aligned with seal)
 * 3. Client section (name + address)
 * 4. Greeting text
 * 5. Info block (full width): Subject, Due date, Bank info (black labels)
 * 6. Line items table (black header)
 * 7. Tax breakdown (right-aligned)
 * 8. Carried forward block (conditional)
 * 9. Grand total block (prominent, AFTER line items)
 * 10. Notes section (black label)
 *
 * Design requirements:
 * - Black background labels (件名/支払期限/振込先/合計/備考)
 * - Grand total with "left black band + right large amount"
 * - Contact person + seal horizontal layout in issuer block
 * - No "border only" design - all labels have black background
 */

import type { DocumentWithTotals, IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';
import type { SealSize, BackgroundDesign } from './types';
import type { TemplateOptions } from './templates/templateRegistry';
import type { BlockPlacements } from '@/types/blockPlacement';
import { getSealSizePx, DEFAULT_SEAL_SIZE } from './types';
import { getBackgroundCss, getBackgroundHtml } from './backgroundDesigns';
import { getDocumentLabels } from './templates/documentLabels';
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  parseAddressWithPostalCode,
  escapeHtml,
  isValidImageDataUri,
} from './templateUtils';
import { isDefaultResolvedPlacement } from './blockPlacementResolver';
import { TEMPLATE_DEFAULT_BLOCK_PLACEMENTS } from './blockPlacementDefaults';
import {
  computePerBlockStatus,
  placeBlocks,
  renderBlockLayoutTop,
  renderBlockLayoutBottom,
  BLOCK_LAYOUT_GRID_CSS,
  type RenderedBlocks,
} from './blockPlacementLayout';

// === Local Helper Functions ===

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
 * Render the document title section with meta info (No, issue date)
 * タイトルとメタ情報を1つのセクションに統合
 */
function renderTitleWithMeta(doc: DocumentWithTotals): string {
  const labels = getDocumentLabels(doc.type);
  const title = doc.type === 'estimate' ? '見　積　書' : '請　求　書';
  return `
    <div class="title-section">
      <div class="title-row">
        <div class="title-spacer"></div>
        <h1 class="document-title">${title}</h1>
        <div class="title-meta">
          <table class="meta-table">
            <tr>
              <td class="meta-label">No</td>
              <td class="meta-value">${escapeHtml(doc.documentNo)}</td>
            </tr>
            <tr>
              <td class="meta-label">${labels.dateLabel}</td>
              <td class="meta-value">${formatDate(doc.issueDate)}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;
}


// === Fragment primitives (P4-C-3, SPEC §7.2.5) ===
//
// 各 generator が「block を含む旧 helper」と「block を抜いた版」を二重実装する
// のを避けるため、断片プリミティブに分解する。legacy 合成 (= 旧コード再現) と
// override 合成 (= 必要部分だけ抜く) で **同じ断片関数を共有** する。
//
// FORMAL_STANDARD と概念的に同じ pattern だが、ACCOUNTING の seal は issuer-block
// 内に inline で挿入される構造のため、buildIssuerInfoLines は includeSeal フラグ
// を取る (FORMAL では seal が flexbox の隣で常時別レンダリングだったのに対し、
// ACCOUNTING は line array の mid-position に挿入される)。

/**
 * Seal 単独 fragment (`<div class="issuer-seal">` 単位) — SPEC §7.2.5。
 * issuerSnapshot.sealImageBase64 のみ参照 (依存最小)。
 */
function renderSealFragment(issuerSnapshot: IssuerSnapshot): string {
  const hasSeal = isValidImageDataUri(issuerSnapshot.sealImageBase64);
  if (!hasSeal) return '';
  return `<div class="issuer-seal"><img src="${issuerSnapshot.sealImageBase64}" alt="印影" class="seal-image" /></div>`;
}

/**
 * Bank info 単独 fragment (table-row level) — SPEC §7.2.5。
 *
 * 振込先情報を `<tr>...</tr>` で返す。情報無しは ''。
 * **legacy 合成専用**: info-block-table 内の rows の一つとして組み立てられる。
 *
 * **override 経路で grid cell に投入する場合は使わないこと**: bare `<tr>` を
 * `<div class="block-layout-cell">` の中に入れると HTML が invalid になり
 * (browser parser が tr を drop / reparent する)、`.info-block-table tr` の
 * styling も適用されない (Codex P4-C-3 review iter1 blocking 反映)。
 * override 経路では `renderBankBlockForCell()` で table wrapper を付けて使う。
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
        <td class="info-label">振込先</td>
        <td class="info-value">${bankLines.join('<br>')}</td>
      </tr>
    `;
}

/**
 * Notes 単独 fragment (notes-section 単位) — SPEC §7.2.5.
 * doc.notes が null/空でも legacy 互換のため空 box を出力する (旧挙動凍結)。
 */
function renderNotesFragment(doc: DocumentWithTotals): string {
  return `
    <div class="formal-notes-section">
      <div class="notes-title">備考欄</div>
      <div class="notes-content">${doc.notes ? escapeHtml(doc.notes) : ''}</div>
    </div>
  `;
}

/**
 * Build issuer info lines. ACCOUNTING の seal は issuer-block 内に inline 挿入
 * されるため、includeSeal フラグで seal 行を含めるかを制御する (FORMAL は seal
 * が flex 隣のため常に別レンダリング)。
 *
 * line order: companyName → postal → address1 → address2 → tel → [seal] →
 *             registration → contact
 *
 * `includeSeal=false` は override branch で seal が moved/hidden の時に使う
 * (issuer-block から seal だけ抜いて、grid セルへ配置するため)。
 */
function buildIssuerInfoLines(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeSeal: boolean
): string[] {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);
  const hasContact = !!issuerSnapshot.contactPerson;

  const lines: string[] = [];

  if (issuerSnapshot.companyName) {
    lines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }

  const parsedAddress = parseAddressWithPostalCode(issuerSnapshot.address);
  if (parsedAddress.postalCode) {
    lines.push(`<div class="issuer-postal">${escapeHtml(parsedAddress.postalCode)}</div>`);
  }
  if (parsedAddress.addressLine1) {
    lines.push(`<div class="issuer-address">${escapeHtml(parsedAddress.addressLine1)}</div>`);
  }
  if (parsedAddress.addressLine2) {
    lines.push(`<div class="issuer-address">${escapeHtml(parsedAddress.addressLine2)}</div>`);
  }

  if (issuerSnapshot.phone) {
    lines.push(`<div class="issuer-tel">TEL: ${escapeHtml(issuerSnapshot.phone)}</div>`);
  }

  if (includeSeal) {
    const sealHtml = renderSealFragment(issuerSnapshot);
    if (sealHtml) {
      lines.push(sealHtml);
    }
  }

  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    lines.push(`<div class="issuer-registration">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  if (hasContact) {
    lines.push(`<div class="issuer-contact">担当: ${escapeHtml(issuerSnapshot.contactPerson!)}</div>`);
  }

  return lines;
}

/**
 * Issuer info text (seal を含まない issuer info) — SPEC §7.2.5。
 *
 * override branch で seal が moved/hidden された時に header 相当部分 (issuer block)
 * を seal 抜きでレンダリングするための primitive。ACCOUNTING の場合は
 * `<div class="issuer-block">` wrapper の中に seal を含まない lines を join する。
 *
 * lines が空の場合は wrapper も空文字を返す (ACCOUNTING legacy 互換: 元の
 * renderIssuerBlock は lines.length === 0 で空を返す)。
 */
function renderIssuerInfoText(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot, /*includeSeal=*/false);
  if (lines.length === 0) return '';
  return `
    <div class="issuer-block">
      ${lines.join('\n')}
    </div>
  `;
}

/**
 * Render issuer block with seal placed below phone number — legacy composition.
 *
 * Internally delegates to buildIssuerInfoLines(includeSeal=true) で seal を
 * inline 挿入。lines が空なら空文字を返す (legacy 互換)。
 */
function renderIssuerBlock(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const lines = buildIssuerInfoLines(doc, sensitiveSnapshot, /*includeSeal=*/true);

  if (lines.length === 0) {
    return '';
  }

  return `
    <div class="issuer-block">
      ${lines.join('\n')}
    </div>
  `;
}

/**
 * info-block の rows 構築 (bank を含むかフラグで切替) — SPEC §7.2.5.
 *
 * legacy 経路 (renderInfoBlock) は includeBank=true で呼び従来通り bank 行を含む。
 * override 経路で bank が moved/hidden の場合は includeBank=false で呼び、
 * subject/period 行のみ返す。bank fragment は別途 grid セルに配置される。
 *
 * showBankInfo=false (estimate) の場合、includeBank=true でも bank は含まれない
 * (テンプレ仕様の上書き)。
 */
function renderInfoBlockRows(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  includeBank: boolean
): string {
  const labels = getDocumentLabels(doc.type);
  const rows: string[] = [];

  // Subject (件名)
  if (doc.subject) {
    rows.push(`
      <tr>
        <td class="info-label">件名</td>
        <td class="info-value">${escapeHtml(doc.subject)}</td>
      </tr>
    `);
  }

  // Period field (支払期限 or 見積有効期限)
  const periodValue = doc[labels.periodField];
  if (periodValue) {
    rows.push(`
      <tr>
        <td class="info-label">${labels.periodLabel}</td>
        <td class="info-value">${formatDate(periodValue)}</td>
      </tr>
    `);
  }

  // Bank info (振込先) - only for invoice, gated by includeBank for override branch
  if (includeBank && labels.showBankInfo) {
    const bankRow = renderBankFragment(sensitiveSnapshot);
    if (bankRow) rows.push(bankRow);
  }

  return rows.join('');
}

/**
 * Wrap `renderInfoBlockRows()` 出力で `<table class="info-block-table">` を作る。
 * 空 rows の場合は wrapper 自体も省略 (rows が無いのに枠だけ出すのを防ぐ)。
 *
 * legacy / override 両 branch で wrapper の whitespace を完全一致させるため、
 * この共通 helper 経由で組み立てる。override 経路で bank 単独 fragment を grid
 * cell に投入する際にも `renderBankBlockForCell()` 経由で同じ wrapper を再利用する。
 */
function renderInfoBlockFromRows(rowsHtml: string): string {
  if (rowsHtml === '') return '';
  return `
    <table class="info-block-table">
      ${rowsHtml}
    </table>
  `;
}

/**
 * Bank fragment を grid cell に投入するためのラッピング helper。
 *
 * row-level fragment (`<tr>...</tr>`) を `<table class="info-block-table">` で
 * 包み、struct 的に有効な HTML として `<div class="block-layout-cell">` の中に
 * 配置できる形にする。override branch のみで使う。
 *
 * Codex P4-C-3 review iter1 blocking 反映: bare `<tr>` を grid cell に直接置くと
 * browser parser が tr を drop / reparent し、`.info-block-table tr` の styling も
 * 失われる。table wrapper を必ず通すことで構造的妥当性と styling 一貫性を担保する。
 */
function renderBankBlockForCell(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  const bankRow = renderBankFragment(sensitiveSnapshot);
  return renderInfoBlockFromRows(bankRow);
}

/**
 * Render info block — legacy composition.
 *
 * Internally delegates to renderInfoBlockRows(includeBank=true) + renderInfoBlockFromRows.
 */
function renderInfoBlock(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const rowsHtml = renderInfoBlockRows(doc, sensitiveSnapshot, /*includeBank=*/true);
  return renderInfoBlockFromRows(rowsHtml);
}

/**
 * Render carried forward block
 * Only displays when amount > 0
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
 * Render grand total block with prominent styling
 * 合計を視覚的に最も強調
 */
function renderGrandTotalBlock(doc: DocumentWithTotals): string {
  return `
    <div class="grand-total-block">
      <div class="grand-total-label">合計</div>
      <div class="grand-total-value">${formatCurrency(doc.totalYen)} 円（税込）</div>
    </div>
  `;
}

/**
 * Render line items table
 * 明細テーブル: 摘要｜数量｜単位｜単価｜金額
 * 金額は数量×単価の計算結果を表示
 * 集計は renderGrandTotalBlock() で表示するため tfoot は含まない
 */
function renderLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    return `
      <tr>
        <td class="item-name">${escapeHtml(item.name)}</td>
        <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
        <td class="item-unit">${escapeHtml(item.unit)}</td>
        <td class="item-price">${formatCurrency(item.unitPrice)}</td>
        <td class="item-total">${formatCurrency(item.subtotal)}</td>
      </tr>
    `;
  });

  return `
    <table class="formal-items-table">
      <thead>
        <tr>
          <th class="col-name">摘要</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単位</th>
          <th class="col-price">単価</th>
          <th class="col-total">金額</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

/**
 * Render tax breakdown section
 * 税率別内訳: 小計（税抜）、消費税額を表示
 */
function renderTaxBreakdownSection(doc: DocumentWithTotals): string {
  const breakdownRows = doc.taxBreakdown.map((tb) => {
    const rateLabel = tb.rate === 0 ? '非課税' : `${tb.rate}%対象`;
    const taxLabel = tb.rate === 0 ? '非課税' : `消費税(${tb.rate}%)`;
    return `
      <tr>
        <td class="breakdown-rate">${rateLabel}</td>
        <td class="breakdown-subtotal">${formatCurrency(tb.subtotal)}円</td>
        <td class="breakdown-tax-label">${taxLabel}</td>
        <td class="breakdown-tax-value">${formatCurrency(tb.tax)}円</td>
      </tr>
    `;
  });

  return `
    <div class="tax-breakdown-section">
      <table class="tax-breakdown-table">
        <tbody>
          ${breakdownRows.join('')}
          <tr class="breakdown-total-row">
            <td class="breakdown-total-label" colspan="2">小計（税抜）</td>
            <td class="breakdown-total-value" colspan="2">${formatCurrency(doc.subtotalYen)}円</td>
          </tr>
          <tr class="breakdown-total-row">
            <td class="breakdown-total-label" colspan="2">消費税合計</td>
            <td class="breakdown-total-value" colspan="2">${formatCurrency(doc.taxYen)}円</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render notes section — legacy composition.
 *
 * Delegates to renderNotesFragment so the box markup is shared with override
 * branch (where notes is placed in a grid cell at moved position).
 */
function renderNotesSection(doc: DocumentWithTotals): string {
  return renderNotesFragment(doc);
}

// === CSS Styles ===

function getTemplateStyles(accountingSealSizePx: number): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Kaku Gothic Pro', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 30px 35px;
    }

    .document-container {
      max-width: 100%;
      margin: 0 auto;
    }

    /* === Title Section === */
    .title-section {
      margin-bottom: 20px;
    }

    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .title-spacer {
      flex: 1;
    }

    .document-title {
      flex: 0 0 auto;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 0.3em;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
    }

    .title-meta {
      flex: 1;
      display: flex;
      justify-content: flex-end;
    }

    /* Meta Info Table */
    .meta-table {
      border-collapse: collapse;
    }

    .meta-table td {
      padding: 2px 8px;
      font-size: 11px;
    }

    .meta-label {
      text-align: right;
    }

    .meta-value {
      text-align: right;
    }

    /* === Client Section === */
    .client-section {
      margin-bottom: 10px;
    }

    .client-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .client-suffix {
      font-weight: normal;
      margin-left: 8px;
    }

    .client-address {
      font-size: 11px;
      color: #333333;
    }

    .greeting-text {
      font-size: 11px;
      margin: 10px 0 15px 0;
    }

    /* === Issuer Section (Standalone, Right-aligned) === */
    .issuer-section-standalone {
      text-align: right;
      margin: 15px 0;
      padding: 10px 0;
    }

    /* === Info Block Section (Full Width) === */
    .info-block-section {
      margin: 15px 0;
    }

    /* === Issuer Block === */
    .issuer-block {
      text-align: right;
      font-size: 11px;
      line-height: 1.6;
    }

    .issuer-company {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issuer-postal,
    .issuer-address,
    .issuer-tel,
    .issuer-registration {
      margin-bottom: 2px;
    }

    .issuer-registration {
      font-size: 10px;
      color: #333;
    }

    .issuer-seal {
      text-align: right;
      margin: 8px 0;
    }

    .seal-image {
      width: ${accountingSealSizePx}px;
      height: ${accountingSealSizePx}px;
      object-fit: contain;
      opacity: 0.85;
      mix-blend-mode: multiply;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .issuer-contact {
      margin-top: 4px;
    }

    /* === Info Block (Black Labels) === */
    .info-block-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }

    .info-block-table tr {
      border-bottom: 1px solid #ccc;
    }

    .info-block-table tr:last-child {
      border-bottom: none;
    }

    .info-label {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      width: 80px;
      font-weight: bold;
      font-size: 11px;
      vertical-align: top;
    }

    .info-value {
      padding: 8px 12px;
      font-size: 11px;
      background: #fff;
      vertical-align: top;
    }

    /* === Carried Forward Block === */
    .carried-forward-block {
      display: flex;
      border: 1px solid #000;
      margin: 12px 0;
      width: 55%;
    }

    .cf-label {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .cf-value {
      flex: 1;
      padding: 8px 12px;
      text-align: right;
      font-size: 13px;
      font-weight: bold;
      background: #fff;
      border-left: 1px solid #000;
    }

    /* === Grand Total Block === */
    .grand-total-block {
      display: flex;
      border: 2px solid #000;
      margin: 15px 0;
      width: 55%;
    }

    .grand-total-label {
      background: #000;
      color: #fff;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .grand-total-value {
      flex: 1;
      padding: 12px 20px;
      text-align: right;
      font-size: 22px;
      font-weight: bold;
      background: #fff;
      border-left: 2px solid #000;
    }

    /* === Line Items Table === */
    .formal-items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .formal-items-table th {
      background: #000;
      color: #fff;
      padding: 8px 10px;
      font-weight: bold;
      font-size: 10px;
      text-align: center;
      border: 1px solid #000;
    }

    .formal-items-table td {
      padding: 7px 10px;
      font-size: 10px;
      border-bottom: 1px solid #ccc;
    }

    .formal-items-table tr:nth-child(even) {
      background: #f8f8f8;
    }

    .formal-items-table .col-name {
      width: 45%;
      text-align: left;
    }

    .formal-items-table .col-qty {
      width: 10%;
      text-align: right;
    }

    .formal-items-table .col-unit {
      width: 10%;
      text-align: center;
    }

    .formal-items-table .col-price {
      width: 15%;
      text-align: right;
    }

    .formal-items-table .col-total {
      width: 20%;
      text-align: right;
    }

    .formal-items-table .item-name {
      text-align: left;
    }

    .formal-items-table .item-qty {
      text-align: right;
    }

    .formal-items-table .item-unit {
      text-align: center;
    }

    .formal-items-table .item-price {
      text-align: right;
    }

    .formal-items-table .item-total {
      text-align: right;
    }

    /* === Tax Breakdown Section === */
    .tax-breakdown-section {
      display: flex;
      justify-content: flex-end;
      margin: 15px 0;
    }

    .tax-breakdown-table {
      border-collapse: collapse;
      min-width: 350px;
    }

    .tax-breakdown-table td {
      padding: 4px 10px;
      font-size: 10px;
    }

    .breakdown-rate {
      text-align: left;
      font-weight: bold;
    }

    .breakdown-subtotal {
      text-align: right;
    }

    .breakdown-tax-label {
      text-align: left;
      padding-left: 20px !important;
    }

    .breakdown-tax-value {
      text-align: right;
    }

    .breakdown-total-row {
      border-top: 1px solid #999;
    }

    .breakdown-total-label {
      text-align: left;
      font-weight: bold;
    }

    .breakdown-total-value {
      text-align: right;
      font-weight: bold;
    }

    /* === Notes Section === */
    .formal-notes-section {
      margin: 20px 0;
      border: 2px solid #000;
      min-height: 50px;
    }

    .notes-title {
      background: #000;
      color: #fff;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: bold;
    }

    .notes-content {
      padding: 8px 10px;
      font-size: 10px;
      white-space: pre-wrap;
      min-height: 30px;
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

// === Main Template Generator ===

/**
 * Generate invoice accounting template HTML
 *
 * Creates a formal accounting-style invoice layout matching traditional Japanese business documents.
 *
 * @param doc - Document with calculated totals
 * @param sensitiveSnapshot - Sensitive issuer information (bank account, etc.)
 * @returns Complete HTML string for the invoice
 */
export function generateInvoiceAccountingTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  sealSize?: SealSize,
  backgroundDesign?: BackgroundDesign,
  backgroundImageDataUrl?: string | null,
  blockPlacements?: Required<BlockPlacements>
): string {
  // SPEC §5.1 / §7.2 hybrid pattern (FORMAL_STANDARD と同じ pattern):
  //   default 一致 → legacy DOM そのまま (旧コード完全実行、pixel diff 0 を保証)
  //   override   → block-by-block extraction + dual anchor grid (P4-C-3)
  // blockPlacements が未指定 (sealSize.test.ts 等の直接呼び出し) ならテンプレ
  // default にフォールバック → 必ず legacy branch を通る。
  const resolved = blockPlacements ?? TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.ACCOUNTING;
  const isDefault = isDefaultResolvedPlacement(resolved, 'ACCOUNTING');

  const accountingSealSizePx = getSealSizePx(sealSize ?? DEFAULT_SEAL_SIZE, 'ACCOUNTING');
  const accountingBackgroundCss = getBackgroundCss(backgroundDesign ?? 'NONE', backgroundImageDataUrl);
  const accountingBackgroundHtml = getBackgroundHtml(backgroundDesign ?? 'NONE', backgroundImageDataUrl);
  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  // === Block placement decisions (legacy / override) ===
  //
  // legacy branch: 旧 DOM そのまま。block-layout-* / override CSS は一切出力しない。
  //   全 inject points (`${overrideCss}` / `${blockLayoutTopHtml}` /
  //   `${blockLayoutBottomHtml}`) は空文字。テンプレート whitespace に変化なし
  //   → fixture diff 0 を維持。
  // override branch: block-by-block extraction で legacy DOM から moved block を
  //   抜き、dual anchor grid (header 後 / totals 後) に配置。BLOCK_LAYOUT_GRID_CSS
  //   は実際に grid を出す時のみ inject。
  const labels = getDocumentLabels(doc.type);
  let issuerSectionHtml: string;
  let infoSectionHtml: string;
  let notesHtml: string;
  let blockLayoutTopHtml = '';
  let blockLayoutBottomHtml = '';
  let overrideCss = '';

  if (isDefault) {
    const issuerBlockHtml = renderIssuerBlock(doc, sensitiveSnapshot);
    issuerSectionHtml = issuerBlockHtml
      ? `<div class="issuer-section-standalone">${issuerBlockHtml}</div>`
      : '';
    const infoBlockHtml = renderInfoBlock(doc, sensitiveSnapshot);
    infoSectionHtml = infoBlockHtml
      ? `<div class="info-block-section">${infoBlockHtml}</div>`
      : '';
    notesHtml = renderNotesSection(doc);
  } else {
    const templateDefault = TEMPLATE_DEFAULT_BLOCK_PLACEMENTS.ACCOUNTING;
    const perBlock = computePerBlockStatus(resolved, templateDefault);

    // Legacy positions: untouched-at-default block は legacy DOM 内にそのまま残す。
    //   companyStamp untouched → issuer-block 内に seal 残す
    //   bankAccount untouched   → info-block 内に bank row 残す (showBankInfo 時のみ)
    //   remarks untouched       → notes-section をそのまま出力
    const issuerBlockInner = perBlock.companyStamp.isDefault
      ? renderIssuerBlock(doc, sensitiveSnapshot)
      : renderIssuerInfoText(doc, sensitiveSnapshot);
    issuerSectionHtml = issuerBlockInner
      ? `<div class="issuer-section-standalone">${issuerBlockInner}</div>`
      : '';

    const infoRowsHtml = renderInfoBlockRows(
      doc,
      sensitiveSnapshot,
      /*includeBank=*/perBlock.bankAccount.isDefault
    );
    const infoBlockHtml = renderInfoBlockFromRows(infoRowsHtml);
    infoSectionHtml = infoBlockHtml
      ? `<div class="info-block-section">${infoBlockHtml}</div>`
      : '';

    notesHtml = perBlock.remarks.isDefault ? renderNotesSection(doc) : '';

    // Grid placement: moved block (isDefault=false かつ position !== 'hidden') のみ
    // grid セルへ配置。bank は renderBankBlockForCell で `<table>` wrapper を必ず
    // 通す (Codex P4-C-3 iter1 blocking 反映: bare `<tr>` は `<div>` 内に置けない)。
    // estimate では showBankInfo=false のため bank fragment は常に空。
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

    const cells = placeBlocks(resolved, renderedBlocks);
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

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getTemplateStyles(accountingSealSizePx)}
    ${accountingBackgroundCss}${overrideCss}
  </style>
</head>
<body>
  <div class="document-container">
    ${accountingBackgroundHtml}
    <!-- Title with meta info -->
    ${renderTitleWithMeta(doc)}

    <!-- Issuer section (standalone, right-aligned) -->
    ${issuerSectionHtml}

    <!-- Client section -->
    <div class="client-section">
      <div class="client-name">${escapeHtml(doc.clientName)}<span class="client-suffix">御中</span></div>
      ${clientAddressHtml}
    </div>

    <!-- Greeting -->
    <div class="greeting-text">${escapeHtml(labels.greeting)}</div>${blockLayoutTopHtml}

    <!-- Info block (full width) -->
    ${infoSectionHtml}

    <!-- Line items table -->
    ${renderLineItemsTable(doc)}

    <!-- Tax breakdown -->
    ${renderTaxBreakdownSection(doc)}

    <!-- Carried forward (conditional) -->
    ${renderCarriedForwardBlock(doc)}

    <!-- Grand total (after line items) -->
    ${renderGrandTotalBlock(doc)}${blockLayoutBottomHtml}

    <!-- Notes -->
    ${notesHtml}
  </div>
</body>
</html>`;
}

/**
 * TemplateGenerator-compatible wrapper for the registry.
 * Adapts the existing function signature to match TemplateOptions interface.
 */
export function generateAccountingTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  return generateInvoiceAccountingTemplate(
    doc,
    sensitiveSnapshot,
    options.sealSize,
    options.backgroundDesign,
    options.backgroundImageDataUrl,
    options.blockPlacements
  );
}
