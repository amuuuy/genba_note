/**
 * No Pro Tier Gates in (tabs) screens (M1-5 regression guard)
 *
 * PIVOT_PLAN_v2.md §M1 でアプリを完全無料化するため、tabs 配下の
 * 4 画面（index / balance / prices / customers）から Pro ガードを
 * 除去した。このテストはそれらの画面が useProStatus や
 * freeTierLimitsService, Pro 参照を再導入していないことを保証する。
 *
 * 注: settings / customer/[id] / document/[id] / document/preview は
 * 子 component へ isPro prop を渡す連鎖があるため、後続コミットで
 * 別途整理する。ここではその 4 画面をスコープに含めない。
 */

import * as fs from 'fs';
import * as path from 'path';

const TABS_ROOT = path.resolve(__dirname, '../../app/(tabs)');

const SCREENS = ['index.tsx', 'balance.tsx', 'prices.tsx', 'customers.tsx'];

describe('tabs screens have no Pro-tier gates', () => {
  describe.each(SCREENS)('%s', (filename) => {
    const source = fs.readFileSync(path.join(TABS_ROOT, filename), 'utf-8');

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
