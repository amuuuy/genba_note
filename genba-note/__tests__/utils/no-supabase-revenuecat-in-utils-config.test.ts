/**
 * No Supabase / RevenueCat / paywall in utils/config (M1/C8 regression guard)
 *
 * PIVOT_PLAN_v2.md §M1 コミット C8 で utils / config 層から
 * Supabase / RevenueCat / paywall の痕跡を完全撤去する。
 * このテストは fs.readFileSync でソースを静的読み取りし、対象ファイルに
 * 旧 Pro/Supabase/RevenueCat/paywall 系の文字列が残っていないことを保証する。
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8');
}

describe('src/utils/environment.ts', () => {
  const source = readRepoFile('src/utils/environment.ts');

  it('does not mention Pro / IAP in comments', () => {
    expect(source).not.toMatch(/Pro features|IAP|IAP verification/i);
  });

  it('does not reference Supabase or RevenueCat', () => {
    expect(source).not.toMatch(/supabase|revenuecat/i);
  });
});

describe('src/utils/legalLinkHandlers.ts', () => {
  const source = readRepoFile('src/utils/legalLinkHandlers.ts');

  it('does not reference paywall', () => {
    expect(source).not.toMatch(/paywall/i);
  });
});

describe('.env.example', () => {
  const source = readRepoFile('.env.example');

  it('does not define EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY', () => {
    expect(source).not.toMatch(/EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY/);
  });

  it('does not define EXPO_PUBLIC_SUPABASE_URL', () => {
    expect(source).not.toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('does not define EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', () => {
    expect(source).not.toMatch(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it('does not reference RevenueCat or Supabase as a section header', () => {
    expect(source).not.toMatch(/RevenueCat/);
    expect(source).not.toMatch(/Supabase/);
  });

  it('does not mention Pro features gating in APP_ENV comment', () => {
    expect(source).not.toMatch(/Pro機能|IAP|RevenueCat/);
  });
});

describe('eas.json', () => {
  const source = readRepoFile('eas.json');

  it('does not define SUPABASE_URL build env', () => {
    expect(source).not.toMatch(/SUPABASE_URL/);
  });

  it('does not define SUPABASE_PUBLISHABLE_KEY build env', () => {
    expect(source).not.toMatch(/SUPABASE_PUBLISHABLE_KEY|PUBLISHABLE_KEY/);
  });

  it('does not define REVENUECAT_PUBLIC_KEY build env', () => {
    expect(source).not.toMatch(/REVENUECAT_PUBLIC_KEY/);
  });
});
