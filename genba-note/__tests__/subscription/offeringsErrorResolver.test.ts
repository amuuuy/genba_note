/**
 * offeringsErrorResolver tests
 *
 * Tests resolveOfferingsErrorKind which determines error kind
 * based on RevenueCat SDK configuration state.
 */

const mockIsConfigured = jest.fn();

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    isConfigured: mockIsConfigured,
  },
}));

import { resolveOfferingsErrorKind } from '@/subscription/offeringsErrorResolver';

describe('resolveOfferingsErrorKind', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "network" when isConfigured() resolves true', async () => {
    mockIsConfigured.mockResolvedValue(true);
    const kind = await resolveOfferingsErrorKind();
    expect(kind).toBe('network');
  });

  it('returns "not_configured" when isConfigured() resolves false', async () => {
    mockIsConfigured.mockResolvedValue(false);
    const kind = await resolveOfferingsErrorKind();
    expect(kind).toBe('not_configured');
  });

  it('falls back to "network" when isConfigured() throws', async () => {
    mockIsConfigured.mockRejectedValue(new Error('native module error'));
    const kind = await resolveOfferingsErrorKind();
    expect(kind).toBe('network');
  });
});
