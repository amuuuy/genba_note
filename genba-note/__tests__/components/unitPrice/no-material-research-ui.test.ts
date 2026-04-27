/**
 * No Material Research UI (M1/C2 regression guard)
 *
 * PIVOT_PLAN_v2.md §M1 C2 で material research UI を完全削除する。
 * このテストは fs.existsSync でソースを静的確認し、6 UI ファイル + 6 テストファイルの
 * 非存在を保証する。加えて、consumer 側（prices.tsx, LineItemList.tsx,
 * components/unitPrice/index.ts）から MaterialSearchModal 使用箇所が除去されている
 * ことも静的検査する。
 *
 * 注: C2 の直接対象は UI 層。domain 層 (src/domain/materialResearch/, hooks,
 * types) は C5 で削除される別スコープ。
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../..');

const DELETED_UI_FILES = [
  'src/components/unitPrice/MaterialSearchModal.tsx',
  'src/components/unitPrice/MaterialSearchResultItem.tsx',
  'src/components/unitPrice/AiSearchResultView.tsx',
  'src/components/unitPrice/AiPriceItemCard.tsx',
  'src/components/unitPrice/materialSearchLimitUtils.ts',
  'src/components/unitPrice/aiSearchViewState.ts',
];

const DELETED_TEST_FILES = [
  '__tests__/components/unitPrice/MaterialSearchModal.test.ts',
  '__tests__/components/unitPrice/MaterialSearchModal.aiLimit.test.ts',
  '__tests__/components/unitPrice/MaterialSearchModal.rakutenLimit.test.ts',
  '__tests__/components/unitPrice/MaterialSearchResultItem.test.ts',
  '__tests__/components/unitPrice/AiSearchResultView.test.ts',
  '__tests__/components/unitPrice/AiPriceItemCard.test.ts',
];

const CONSUMERS_WITHOUT_MATERIAL_SEARCH = [
  'app/(tabs)/prices.tsx',
  'src/components/document/edit/LineItemList.tsx',
  'src/components/unitPrice/index.ts',
];

describe('No material research UI source files', () => {
  it.each(DELETED_UI_FILES)('%s has been removed', (relativePath) => {
    expect(fs.existsSync(path.join(REPO_ROOT, relativePath))).toBe(false);
  });
});

describe('No material research UI test files', () => {
  it.each(DELETED_TEST_FILES)('%s has been removed', (relativePath) => {
    expect(fs.existsSync(path.join(REPO_ROOT, relativePath))).toBe(false);
  });
});

describe('No MaterialSearchModal references in consumers', () => {
  describe.each(CONSUMERS_WITHOUT_MATERIAL_SEARCH)('%s', (relativePath) => {
    const source = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');

    it('has no MaterialSearchModal import or usage', () => {
      expect(source).not.toMatch(/MaterialSearchModal/);
    });

    it('has no MaterialSearchResultItem reference', () => {
      expect(source).not.toMatch(/MaterialSearchResultItem/);
    });

    it('has no AiSearchResultView reference', () => {
      expect(source).not.toMatch(/AiSearchResultView/);
    });

    it('has no AiPriceItemCard reference', () => {
      expect(source).not.toMatch(/AiPriceItemCard/);
    });
  });
});
