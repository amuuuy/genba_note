/**
 * Root Layout — No Paid-Tier Initialization (M1-3 regression guard)
 *
 * PIVOT_PLAN_v2.md §M1 コミット3 で RevenueCat SDK と Supabase Auth の
 * 初期化呼び出しを app/_layout.tsx から剥がす。このテストは静的に
 * ソースを読み、これらの初期化／import が再導入されていないことを保証する。
 *
 * 注: src/subscription/ と src/domain/auth/ の実装本体はコミット4 / 5
 * で削除予定。このテストは「呼び出し側から消えている」ことのみを担保する。
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Root layout does not initialize paid-tier SDKs', () => {
  const layoutSource = fs.readFileSync(
    path.resolve(__dirname, '../../app/_layout.tsx'),
    'utf-8',
  );

  it('does not import from @/subscription', () => {
    expect(layoutSource).not.toMatch(/from\s+['"]@\/subscription['"]/);
  });

  it('does not import from @/domain/auth', () => {
    expect(layoutSource).not.toMatch(/from\s+['"]@\/domain\/auth['"]/);
  });

  it('does not reference configureRevenueCat', () => {
    expect(layoutSource).not.toMatch(/configureRevenueCat/);
  });

  it('does not reference initializeAuth', () => {
    expect(layoutSource).not.toMatch(/initializeAuth/);
  });

  it('does not gate rendering on isRevenueCatReady', () => {
    expect(layoutSource).not.toMatch(/isRevenueCatReady/);
  });

  it('does not reference the RevenueCat public key env var', () => {
    expect(layoutSource).not.toMatch(/EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY/);
  });
});
