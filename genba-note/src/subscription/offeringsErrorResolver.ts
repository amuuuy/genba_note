/**
 * Offerings error kind resolver.
 *
 * Determines the kind of error that occurred during offerings fetch
 * by checking RevenueCat SDK configuration state. Returns a domain-level
 * error kind, not UI messages.
 */

import Purchases from 'react-native-purchases';

export type OfferingsErrorKind = 'none' | 'network' | 'not_configured';

/**
 * Resolves the error kind by checking if RevenueCat SDK is configured.
 * Called after getOfferings() fails to distinguish network errors from
 * SDK-not-configured errors.
 */
export async function resolveOfferingsErrorKind(): Promise<OfferingsErrorKind> {
  let configured = true;
  try {
    configured = await Purchases.isConfigured();
  } catch {
    // If isConfigured() itself fails, assume configured (network error)
  }
  return configured ? 'network' : 'not_configured';
}
