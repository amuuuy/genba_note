/**
 * templateOptions — post-M1 no-Pro-gate tests
 *
 * PIVOT_PLAN_v2.md §M1 で Pro tier が全撤去され、全テンプレが無料で選択可能。
 * requiresPro / isProTemplate / isPro 引数は完全削除済み。
 */

import {
  TEMPLATE_OPTIONS,
  resolveTemplateForUser,
  getSelectableTemplateOptions,
} from '@/constants/templateOptions';
import { DOCUMENT_TEMPLATE_IDS } from '@/types/settings';

describe('TEMPLATE_OPTIONS', () => {
  it('has exactly 6 entries matching DOCUMENT_TEMPLATE_IDS', () => {
    expect(TEMPLATE_OPTIONS).toHaveLength(DOCUMENT_TEMPLATE_IDS.length);
  });

  it('covers all DocumentTemplateId values', () => {
    const values = TEMPLATE_OPTIONS.map((o) => o.value);
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      expect(values).toContain(id);
    }
  });
});

describe('resolveTemplateForUser', () => {
  it('returns the input templateId regardless of document type', () => {
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      expect(resolveTemplateForUser('estimate', id)).toBe(id);
      expect(resolveTemplateForUser('invoice', id)).toBe(id);
    }
  });
});

describe('getSelectableTemplateOptions', () => {
  it('returns all 6 templates', () => {
    const options = getSelectableTemplateOptions();
    expect(options).toHaveLength(6);
  });
});
