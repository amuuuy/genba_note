/**
 * templateOptions — post-M1 no-Pro-gate tests
 *
 * PIVOT_PLAN_v2.md §M1 で「Pro テンプレ全開放」となり、全テンプレが
 * 無料で選択可能になった。requiresPro は全 false、isPro 引数は
 * 互換目的で残っているが関数の結果には影響しない（no-op）。
 */

import {
  TEMPLATE_OPTIONS,
  isProTemplate,
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

  it('every template is marked requiresPro=false (post-M1)', () => {
    for (const option of TEMPLATE_OPTIONS) {
      expect(option.requiresPro).toBe(false);
    }
  });
});

describe('isProTemplate (post-M1)', () => {
  it('returns false for every template ID', () => {
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      expect(isProTemplate(id)).toBe(false);
    }
  });
});

describe('resolveTemplateForUser (post-M1)', () => {
  it('returns the input templateId regardless of isPro flag', () => {
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      expect(resolveTemplateForUser('estimate', id, false)).toBe(id);
      expect(resolveTemplateForUser('estimate', id, true)).toBe(id);
      expect(resolveTemplateForUser('invoice', id, false)).toBe(id);
      expect(resolveTemplateForUser('invoice', id, true)).toBe(id);
    }
  });
});

describe('getSelectableTemplateOptions (post-M1)', () => {
  it('returns all 6 templates with disabled=false regardless of isPro flag', () => {
    for (const flag of [true, false]) {
      const options = getSelectableTemplateOptions(flag);
      expect(options).toHaveLength(6);
      expect(options.every((o) => o.disabled === false)).toBe(true);
    }
  });
});
