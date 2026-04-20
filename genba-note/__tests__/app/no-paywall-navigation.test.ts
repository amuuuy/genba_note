/**
 * No Paywall Navigation (M1-1 regression guard)
 *
 * PIVOT_PLAN_v2.md §M1 コミット1 で paywall への到達経路を完全遮断する。
 * このテストは fs.readFileSync でソースを静的読み取りし、対象 9 ファイルに
 * '/paywall' リテラルおよび _layout.tsx の Stack.Screen name="paywall"
 * 登録が残っていないことを保証する。
 *
 * 注: paywall.tsx 本体と既存の paywall*.test.ts はコミット2 で削除予定。
 * このコミットでは到達経路の遮断のみを扱うため、それらはスコープ外。
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_APP_ROOT = path.resolve(__dirname, '../../app');

const SCREENS_WITHOUT_PAYWALL_LITERAL = [
  '(tabs)/settings.tsx',
  '(tabs)/index.tsx',
  '(tabs)/prices.tsx',
  '(tabs)/balance.tsx',
  '(tabs)/customers.tsx',
  'document/preview.tsx',
  'document/[id].tsx',
  'customer/[id].tsx',
];

describe('No paywall navigation entry points', () => {
  it('app/_layout.tsx does not register a paywall route', () => {
    const source = fs.readFileSync(path.join(REPO_APP_ROOT, '_layout.tsx'), 'utf-8');
    expect(source).not.toMatch(/name\s*=\s*["']paywall["']/);
  });

  describe.each(SCREENS_WITHOUT_PAYWALL_LITERAL)('%s', (relativePath) => {
    const source = fs.readFileSync(path.join(REPO_APP_ROOT, relativePath), 'utf-8');

    it('has no "/paywall" string literal', () => {
      expect(source).not.toMatch(/["']\/paywall["']/);
    });

    it('has no <Link href="/paywall"> element', () => {
      expect(source).not.toMatch(/href\s*=\s*["']\/paywall["']/);
    });
  });
});
