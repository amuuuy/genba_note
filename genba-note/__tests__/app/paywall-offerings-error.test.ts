/**
 * PaywallScreen wiring verification tests
 *
 * Verifies that paywall.tsx uses the production fetchOfferingsController,
 * paywallMessages, and paywallState modules. The actual logic is fully
 * tested in their respective test files:
 * - fetchOfferingsController.test.ts
 * - offeringsErrorResolver.test.ts
 * - paywallMessages.test.ts
 * - paywallState.test.ts
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const paywallSource = fs.readFileSync(
  path.resolve(__dirname, '../../app/paywall.tsx'),
  'utf-8',
);

describe('PaywallScreen wiring', () => {
  it('imports fetchOfferingsController from subscription layer', () => {
    expect(paywallSource).toContain('fetchOfferingsController');
    expect(paywallSource).toContain('@/subscription/fetchOfferingsController');
  });

  it('imports presentation functions from paywallMessages (app layer)', () => {
    expect(paywallSource).toContain('getOfferingsErrorMessage');
    expect(paywallSource).toContain('getEmptyStateMessage');
    expect(paywallSource).toContain('./paywallMessages');
  });

  it('imports paywallState module from app layer (dismissError, setOfferingsError)', () => {
    expect(paywallSource).toContain('./paywallState');
    expect(paywallSource).toContain('dismissError');
    expect(paywallSource).toContain('setOfferingsError');
  });

  it('uses initialErrorState for state initialization', () => {
    expect(paywallSource).toContain('initialErrorState');
  });

  it('calls fetchOfferingsController in useEffect', () => {
    expect(paywallSource).toContain('fetchOfferingsController()');
  });

  it('converts errorKind to message via getOfferingsErrorMessage', () => {
    expect(paywallSource).toContain('getOfferingsErrorMessage(result.errorKind)');
  });

  it('has a retry handler for re-fetching offerings', () => {
    expect(paywallSource).toContain('handleRetryOfferings');
  });

  it('renders a retry button with 再読み込み label', () => {
    expect(paywallSource).toContain('再読み込み');
  });

  it('imports clearOfferingsError from paywallState', () => {
    expect(paywallSource).toContain('clearOfferingsError');
  });
});
