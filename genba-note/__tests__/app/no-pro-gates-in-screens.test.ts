/**
 * No Pro Tier Gates in screens (M1 regression guard)
 *
 * PIVOT_PLAN_v2.md §M1 でアプリを完全無料化するため、以下の画面から
 * Pro ガード（useProStatus / freeTierLimitsService 呼び出し）を除去した。
 * このテストはそれらが再導入されていないことを保証する。
 *
 * 監視対象（M1 の進行に応じて追加される）:
 * - (tabs)/index, balance, prices, customers        (M1-5)
 * - customer/[id]                                   (M1-6)
 * - (tabs)/settings                                 (M1-7)
 * - document/[id]                                   (M1-8)
 *
 * 未カバー（後続コミットで追加予定）:
 * - document/preview は useProStatus + resolveTemplateForUser を
 *   依然経由しており、次コミットで整理する
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_ROOT = path.resolve(__dirname, '../../app');

const SCREENS = [
  '(tabs)/index.tsx',
  '(tabs)/balance.tsx',
  '(tabs)/prices.tsx',
  '(tabs)/customers.tsx',
  '(tabs)/settings.tsx',
  'customer/[id].tsx',
  'document/[id].tsx',
];

describe('screens have no Pro-tier gates', () => {
  describe.each(SCREENS)('%s', (relativePath) => {
    const source = fs.readFileSync(path.join(APP_ROOT, relativePath), 'utf-8');

    it('does not import useProStatus', () => {
      expect(source).not.toMatch(/from\s+['"][^'"]*hooks\/useProStatus['"]/);
    });

    it('does not import from freeTierLimitsService', () => {
      expect(source).not.toMatch(/from\s+['"][^'"]*subscription\/freeTierLimitsService['"]/);
    });

    it('does not reference canCreate* / canAddPhoto / canSearch* gate helpers', () => {
      expect(source).not.toMatch(/\bcan(Create|AddPhoto|Search)[A-Za-z]*\s*\(/);
    });

    it('does not destructure isPro from any hook', () => {
      expect(source).not.toMatch(/{\s*isPro\b/);
    });
  });
});
