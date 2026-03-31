/**
 * fetchOfferings controller — extracted from PaywallScreen for testability.
 *
 * Encapsulates the offerings fetch logic and error kind resolution.
 * Returns domain-level results (packages + errorKind), not UI state or messages.
 */

import Purchases from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import {
  type OfferingsErrorKind,
  resolveOfferingsErrorKind,
} from './offeringsErrorResolver';

export interface FetchOfferingsResult {
  monthlyPackage: PurchasesPackage | null;
  annualPackage: PurchasesPackage | null;
  errorKind: OfferingsErrorKind;
}

/**
 * Fetches offerings from RevenueCat and returns the packages + error kind.
 * This is the production logic extracted from PaywallScreen.useEffect.
 */
export async function fetchOfferingsController(): Promise<FetchOfferingsResult> {
  let monthlyPackage: PurchasesPackage | null = null;
  let annualPackage: PurchasesPackage | null = null;
  let errorKind: OfferingsErrorKind = 'none';

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (current) {
      monthlyPackage = current.monthly;
      annualPackage = current.annual;
    }
  } catch {
    errorKind = await resolveOfferingsErrorKind();
  }

  return { monthlyPackage, annualPackage, errorKind };
}
