/**
 * Root Layout — No Paid-Tier Initialization (M1 regression guard)
 *
 * v1.0.1 で RevenueCat SDK と Supabase Auth を完全撤去した。このテストは
 * app/_layout.tsx を静的に読み、これらの初期化呼び出し／import が再導入
 * されていないことを保証する。
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
