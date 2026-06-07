/**
 * Shared 6-column table tests (摘要→名称+仕様 unification).
 *
 * CONSTRUCTION already had its own 6-column tests; CLASSIC is covered in
 * classicTemplate.test.ts (it additionally owns the 以下余白 colspan="6" case).
 * This file gates the remaining templates that were migrated from 5 → 6 columns
 * so a broken spec cell / wrong header order / missing escape is caught directly,
 * independent of the frozen snapshot fixtures.
 */

import { getTemplate } from '@/pdf/templates/templateRegistry';
import '@/pdf/templates/registerAllTemplates';
import type { DocumentTemplateId } from '@/types/settings';
import {
  createTestDocumentWithTotals,
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

interface Case {
  id: DocumentTemplateId;
  tableClass: string;
  headers: string[];
}

const CASES: Case[] = [
  {
    id: 'FORMAL_STANDARD',
    tableClass: 'formal-items-table',
    headers: ['名称', '仕様', '数量', '単位', '単価（税抜）', '金額（税抜）'],
  },
  {
    id: 'SIMPLE',
    tableClass: 'simple-items-table',
    headers: ['名称', '仕様', '数量', '単位', '単価（税抜）', '金額（税抜）'],
  },
  {
    id: 'MODERN',
    tableClass: 'modern-items-table',
    headers: ['名称', '仕様', '数量', '単位', '単価（税抜）', '金額（税抜）'],
  },
  {
    id: 'ACCOUNTING',
    tableClass: 'formal-items-table',
    headers: ['名称', '仕様', '数量', '単位', '単価', '金額'],
  },
];

function itemsThead(html: string, tableClass: string): string[] {
  const m = html.match(
    new RegExp(`<table class="${tableClass}">[\\s\\S]*?<thead>([\\s\\S]*?)<\\/thead>`)
  );
  expect(m).toBeTruthy();
  return Array.from(m![1].matchAll(/<th[^>]*>([^<]*)<\/th>/g)).map((x) =>
    x[1].trim()
  );
}

describe.each(CASES)('6-column table — $id', ({ id, tableClass, headers }) => {
  it('renders header columns in order 名称→仕様→数量→単位→単価→金額', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate(id)(doc, null, defaultOptions);
    expect(itemsThead(html, tableClass)).toEqual(headers);
  });

  it('does not keep the old 摘要 header', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate(id)(doc, null, defaultOptions);
    expect(html).not.toMatch(/<th[^>]*>摘要/);
  });

  it('renders the spec value in the item-spec cell right after item-name', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      lineItems: [createTestLineItem({ name: '基礎工事', spec: 't=50' })],
    });
    const html = getTemplate(id)(doc, null, defaultOptions);
    // Bind the value to the new 仕様 cell — guards against spec being concatenated
    // into the name cell while item-spec is left empty.
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
      const html = getTemplate(id)(doc, null, defaultOptions);
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
    const html = getTemplate(id)(doc, null, defaultOptions);
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    // Escaped payload must live in the item-spec cell, not elsewhere.
    expect(html).toMatch(
      /<td class="item-spec">&lt;img src=x onerror=alert\(1\)&gt;<\/td>/
    );
  });
});
