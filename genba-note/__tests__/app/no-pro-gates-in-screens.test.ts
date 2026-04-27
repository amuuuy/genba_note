/**
 * No Pro Tier Gates in screens (M1 regression guard)
 *
 * v1.0.1 でアプリを完全無料化したため、対象画面から Pro ガード
 * （useProStatus / freeTierLimitsService 呼び出し、isPro 分岐、
 * canCreate / canAddPhoto / canSearch 等の gate helpers）を除去した。
 * このテストはそれらが再導入されていないことを保証する。
 *
 * 対象画面:
 * - (tabs)/index, balance, prices, customers, settings
 * - customer/[id]
 * - document/[id]
 *
 * document/preview.tsx は対象外。M1 で Pro 分岐は撤去済み（resolveTemplateForUser
 * は v1.0.1 で全テンプレを許容する単純な resolver に縮小済）であり、
 * 上記の正規表現にもヒットしないため独立した監視は不要。
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
