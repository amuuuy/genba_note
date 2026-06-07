/**
 * CLASSIC Template Tests
 *
 * Verifies CLASSIC template-specific design features:
 * Mincho font, double border, 御 prefix titles, 以下余白, grid table.
 */

import { getTemplate } from '@/pdf/templates/templateRegistry';
import '@/pdf/templates/registerAllTemplates';
import {
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
  createTestLineItem,
} from './helpers';

const defaultOptions = {
  sealSize: 'MEDIUM' as const,
  backgroundDesign: 'NONE' as const,
  blockPlacements: {
    bankAccount: 'top-center' as const,
    companyStamp: 'top-right' as const,
    remarks: 'bottom-center' as const,
  },
};

describe('CLASSIC template', () => {
  it('uses Mincho font family', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    expect(html).toMatch(/Hiragino Mincho/);
  });

  it('has double border (border: double)', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    expect(html).toMatch(/border.*double/);
  });

  it('uses 御見積書 title for estimate', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    expect(html).toContain('御見積書');
  });

  it('uses 御請求書 title for invoice', () => {
    const doc = createTestDocumentWithTotals({ type: 'invoice' });
    const sensitive = createTestSensitiveSnapshot();
    const html = getTemplate('CLASSIC')(doc, sensitive, defaultOptions);
    expect(html).toContain('御請求書');
  });

  it('contains 以下余白 row', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    expect(html).toContain('以下余白');
  });

  it('does NOT use display: flex for header layout (full-width sequential)', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    // The header sections should not use flexbox two-column layout
    // Note: flex may appear in other contexts (e.g., totals), but header should be sequential
    const headerSection = html.match(/\.classic-header\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(headerSection).not.toContain('display: flex');
  });

  it('does NOT use #f0f0f0 background in notes section', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate', notes: 'テスト備考' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    // CLASSIC notes uses thick border + Mincho bold title, not gray background
    const notesSection = html.match(/\.classic-notes[^{]*\{[^}]*\}/s)?.[0] ?? '';
    expect(notesSection).not.toMatch(/background:\s*#f0f0f0/);
  });

  it('has full grid table borders (1px solid #333)', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    expect(html).toMatch(/1px solid #333/);
  });

  it('has vermillion seal circle frame (#C41E3A)', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
    expect(html).toContain('#C41E3A');
  });

  it('shows bank info for invoice', () => {
    const doc = createTestDocumentWithTotals({ type: 'invoice' });
    const sensitive = createTestSensitiveSnapshot();
    const html = getTemplate('CLASSIC')(doc, sensitive, defaultOptions);
    expect(html).toContain('みずほ銀行');
  });

  it('hides bank info for estimate', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const sensitive = createTestSensitiveSnapshot();
    const html = getTemplate('CLASSIC')(doc, sensitive, defaultOptions);
    expect(html).not.toContain('みずほ銀行');
  });

  describe('6-column table (名称/仕様/数量/単位/単価/金額)', () => {
    const itemsThead = (html: string): string[] => {
      const m = html.match(
        /<table class="classic-items-table">[\s\S]*?<thead>([\s\S]*?)<\/thead>/
      );
      expect(m).toBeTruthy();
      return Array.from(m![1].matchAll(/<th[^>]*>([^<]*)<\/th>/g)).map((x) =>
        x[1].trim()
      );
    };

    it('renders header columns in order: 名称→仕様→数量→単位→単価→金額', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
      expect(itemsThead(html)).toEqual([
        '名称',
        '仕様',
        '数量',
        '単位',
        '単価（税抜）',
        '金額（税抜）',
      ]);
    });

    it('renders the spec value in the item-spec cell right after item-name', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        lineItems: [createTestLineItem({ name: '基礎工事', spec: 't=50' })],
      });
      const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
      expect(html).toMatch(
        /<td class="item-name">基礎工事<\/td>\s*<td class="item-spec">t=50<\/td>/
      );
    });

    it('renders an empty item-spec cell when spec is null or undefined', () => {
      for (const spec of [null, undefined]) {
        const doc = createTestDocumentWithTotals({
          type: 'estimate',
          lineItems: [createTestLineItem({ name: '墨出し', spec })],
        });
        const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
        expect(html).toMatch(
          /<td class="item-name">墨出し<\/td>\s*<td class="item-spec"><\/td>/
        );
      }
    });

    it('HTML-escapes a malicious spec value inside the item-spec cell (XSS safety)', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        lineItems: [
          createTestLineItem({ name: '工事', spec: '<img src=x onerror=alert(1)>' }),
        ],
      });
      const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toMatch(
        /<td class="item-spec">&lt;img src=x onerror=alert\(1\)&gt;<\/td>/
      );
    });

    it('uses colspan="6" for the 以下余白 blank row', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CLASSIC')(doc, null, defaultOptions);
      expect(html).toMatch(/<td colspan="6">以下余白<\/td>/);
    });
  });
});
