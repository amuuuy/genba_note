/**
 * fetchOfferingsController tests
 *
 * Tests the production fetch → error kind pipeline that PaywallScreen's
 * useEffect delegates to. Returns domain-level results (packages + errorKind),
 * not UI messages. Covers:
 * - Successful fetch with packages
 * - Successful fetch with empty offerings (no current)
 * - Fetch failure when SDK is configured (network error)
 * - Fetch failure when SDK is not configured
 * - Fetch failure when isConfigured() itself throws
 */

const mockGetOfferings = jest.fn();
const mockIsConfigured = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getOfferings: mockGetOfferings,
    isConfigured: mockIsConfigured,
  },
}));

import { fetchOfferingsController } from '@/subscription/fetchOfferingsController';

describe('fetchOfferingsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns packages and errorKind "none" when fetch succeeds', async () => {
    const fakeMonthly = { identifier: '$rc_monthly', product: { price: 480 } };
    const fakeAnnual = { identifier: '$rc_annual', product: { price: 3800 } };
    mockGetOfferings.mockResolvedValue({
      current: { monthly: fakeMonthly, annual: fakeAnnual },
    });

    const result = await fetchOfferingsController();

    expect(result.monthlyPackage).toBe(fakeMonthly);
    expect(result.annualPackage).toBe(fakeAnnual);
    expect(result.errorKind).toBe('none');
  });

  it('returns null packages and errorKind "none" when no current offering', async () => {
    mockGetOfferings.mockResolvedValue({ current: null });

    const result = await fetchOfferingsController();

    expect(result.monthlyPackage).toBeNull();
    expect(result.annualPackage).toBeNull();
    expect(result.errorKind).toBe('none');
  });

  it('returns errorKind "network" when fetch fails and SDK is configured', async () => {
    mockGetOfferings.mockRejectedValue(new Error('network error'));
    mockIsConfigured.mockResolvedValue(true);

    const result = await fetchOfferingsController();

    expect(result.monthlyPackage).toBeNull();
    expect(result.annualPackage).toBeNull();
    expect(result.errorKind).toBe('network');
  });

  it('returns errorKind "not_configured" when fetch fails and SDK is not configured', async () => {
    mockGetOfferings.mockRejectedValue(new Error('not configured'));
    mockIsConfigured.mockResolvedValue(false);

    const result = await fetchOfferingsController();

    expect(result.monthlyPackage).toBeNull();
    expect(result.annualPackage).toBeNull();
    expect(result.errorKind).toBe('not_configured');
  });

  it('returns errorKind "network" when fetch fails and isConfigured throws', async () => {
    mockGetOfferings.mockRejectedValue(new Error('getOfferings failed'));
    mockIsConfigured.mockRejectedValue(new Error('native module error'));

    const result = await fetchOfferingsController();

    expect(result.errorKind).toBe('network');
  });
});
