/**
 * No Paywall Navigation (M1 regression guard)
 *
 * v1.0.1 で paywall を完全廃止した。このテストは fs.readFileSync でソースを
 * 静的読み取りし、(1) 対象画面ソースに '/paywall' リテラルが残っていないこと、
 * (2) _layout.tsx に Stack.Screen name="paywall" 登録が残っていないこと、
 * (3) app/paywall.tsx 本体および app/paywallMessages.ts / app/paywallState.ts
 * が存在しないこと を保証する。paywall 関連の旧 test ファイルは M1 で削除済み。
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

const PAYWALL_SOURCE_FILES = [
  'paywall.tsx',
  'paywallMessages.ts',
  'paywallState.ts',
];

describe('No paywall source files', () => {
  it.each(PAYWALL_SOURCE_FILES)('app/%s has been removed', (filename) => {
    expect(fs.existsSync(path.join(REPO_APP_ROOT, filename))).toBe(false);
  });
});

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
