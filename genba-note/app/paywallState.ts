/**
 * Pure state helpers for PaywallScreen.
 *
 * These functions model the paywall's error state transitions without
 * React dependencies, making them directly testable in a node environment.
 */

export interface PaywallErrorState {
  /** Persistent error from offerings fetch failure (not dismissible) */
  offeringsError: string | null;
  /** Dismissible error from purchase/restore operations */
  error: string | null;
}

/** Initial error state */
export const initialErrorState: PaywallErrorState = {
  offeringsError: null,
  error: null,
};

/** Set offerings fetch error (called when getOfferings() rejects) */
export function setOfferingsError(
  state: PaywallErrorState,
  message: string,
): PaywallErrorState {
  return { ...state, offeringsError: message };
}

/** Set operation error (called on purchase/restore failure) */
export function setOperationError(
  state: PaywallErrorState,
  message: string,
): PaywallErrorState {
  return { ...state, error: message };
}

/** Dismiss operation error — only clears `error`, preserves `offeringsError` */
export function dismissError(state: PaywallErrorState): PaywallErrorState {
  return { ...state, error: null };
}
