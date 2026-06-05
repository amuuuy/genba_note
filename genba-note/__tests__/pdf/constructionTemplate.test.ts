/**
 * CONSTRUCTION Template Tests
 *
 * Verifies CONSTRUCTION template-specific design features:
 * 4-column table, 御見積金額/御請求金額, email display, empty table rows,
 * postal code separation, background HTML insertion.
 */

import { getTemplate } from '@/pdf/templates/templateRegistry';
import '@/pdf/templates/registerAllTemplates';
import {
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
  createTestIssuerSnapshot,
  createTestLineItem,
} from './helpers';

const defaultOptions = {
  sealSize: 'MEDIUM' as const,
  backgroundDesign: 'NONE' as const,
  blockPlacements: {
    bankAccount: 'bottom-center' as const,
    companyStamp: 'top-right' as const,
    remarks: 'bottom-center' as const,
  },
};

describe('CONSTRUCTION template', () => {
  it('is registered in the template registry', () => {
    expect(() => getTemplate('CONSTRUCTION')).not.toThrow();
  });

  describe('estimate', () => {
    it('uses 見　積　書 title', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('見　積　書');
    });

    it('uses 御見積金額 label', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('御見積金額');
    });

    it('does not show bank info', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).not.toContain('お振込先');
    });

    it('does not show registration number', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).not.toContain('登録番号');
    });
  });

  describe('invoice', () => {
    it('uses 請　求　書 title', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('請　求　書');
    });

    it('uses 御請求金額 label', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('御請求金額');
    });

    it('shows bank info', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).toContain('お振込先');
      expect(html).toContain('みずほ銀行');
    });

    it('shows registration number', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).toContain('登録番号');
      expect(html).toContain('T1234567890123');
    });
  });

  describe('6-column table (名称/仕様/数量/単位/単価/金額)', () => {
    it('has 名称, 仕様, 数量, 単位, 単価, 金額 column headers', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toMatch(/<th[^>]*>名称/);
      expect(html).toMatch(/<th[^>]*>仕様/);
      expect(html).toMatch(/<th[^>]*>数量/);
      expect(html).toMatch(/<th[^>]*>単位/);
      expect(html).toMatch(/<th[^>]*>単価/);
      expect(html).toMatch(/<th[^>]*>金額/);
    });

    it('does not have 税率 column header but has 単位 and 仕様', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      // 税率 column belongs to other templates and stays absent here.
      expect(html).not.toMatch(/<th[^>]*>税率/);
      // 単位 and 仕様 are the newly added columns.
      expect(html).toMatch(/<th[^>]*>単位/);
      expect(html).toMatch(/<th[^>]*>仕様/);
    });

    it('renders header columns in mock order: 名称→仕様→数量→単位→単価→金額', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      // Scope to <thead> only: 金額 also appears in 御見積金額/合計金額 elsewhere.
      const thead = html.match(/<thead>([\s\S]*?)<\/thead>/);
      expect(thead).toBeTruthy();
      const headers = Array.from(
        thead![1].matchAll(/<th[^>]*>([^<]*)<\/th>/g)
      ).map((m) => m[1].trim());
      expect(headers).toEqual(['名称', '仕様', '数量', '単位', '単価', '金額']);
    });

    it('renders the spec value when present', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        lineItems: [createTestLineItem({ name: '斫り工事', spec: 't=50' })],
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('t=50');
    });

    it('renders an empty spec cell without error when spec is null', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        lineItems: [createTestLineItem({ name: '墨出し', spec: null })],
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('墨出し');
      // Spec column header is still present even when the value is empty.
      expect(html).toMatch(/<th[^>]*>仕様/);
    });

    it('renders the unit value in its own column', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        lineItems: [createTestLineItem({ name: 'カッター入れ', unit: 'm' })],
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toMatch(/<td[^>]*class="[^"]*item-unit[^"]*"[^>]*>m<\/td>/);
    });

    it('HTML-escapes a malicious spec value (XSS safety)', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        lineItems: [
          createTestLineItem({ name: '工事', spec: '<img src=x onerror=alert(1)>' }),
        ],
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      // Raw tag must not appear; escaped entities must be present instead.
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img');
    });

    it('fills empty rows up to minimum 8 total rows', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      // Count all <tr> in tbody (data rows + empty rows)
      const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
      expect(tbodyMatch).toBeTruthy();
      const trCount = (tbodyMatch![1].match(/<tr>/g) || []).length;
      expect(trCount).toBeGreaterThanOrEqual(8);
    });
  });

  describe('email display', () => {
    it('shows email when present in issuer snapshot', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({ email: 'test@example.com' }),
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('E-mail');
      expect(html).toContain('test@example.com');
    });

    it('does not show email line when email is null', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({ email: null }),
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).not.toContain('E-mail');
    });
  });

  describe('postal code separation', () => {
    it('separates postal code from address', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({
          address: '〒150-0001 東京都渋谷区神宮前1-2-3',
        }),
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('〒150-0001');
      expect(html).toContain('東京都渋谷区神宮前1-2-3');
    });
  });

  describe('background HTML', () => {
    it('inserts background overlay div when background design is active', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const options = {
        sealSize: 'MEDIUM' as const,
        backgroundDesign: 'STRIPE' as const,
        blockPlacements: {
          bankAccount: 'bottom-center' as const,
          companyStamp: 'top-right' as const,
          remarks: 'bottom-center' as const,
        },
      };
      const html = getTemplate('CONSTRUCTION')(doc, null, options);
      expect(html).toContain('bg-overlay');
      expect(html).toContain('repeating-linear-gradient');
    });

    it('does not insert background overlay when design is NONE', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).not.toContain('bg-overlay');
    });
  });

  describe('totals section', () => {
    it('shows 小計, 消費税等, 合計金額', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('小計');
      expect(html).toContain('消費税等');
      expect(html).toContain('合計金額');
    });
  });

  describe('notes section', () => {
    it('shows 備考 section', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate', notes: 'テスト備考' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('備考');
      expect(html).toContain('テスト備考');
    });
  });
});
