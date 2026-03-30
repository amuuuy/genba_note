/**
 * Paywall UI messages — presentation layer.
 *
 * Converts domain-level error kinds from fetchOfferingsController
 * into user-facing Japanese messages. Kept separate from subscription
 * layer to maintain clean dependency direction (UI → domain).
 */

import type { OfferingsErrorKind } from '@/subscription/offeringsErrorResolver';

/** Returns the user-facing offerings error message, or null if no error. */
export function getOfferingsErrorMessage(errorKind: OfferingsErrorKind): string | null {
  switch (errorKind) {
    case 'network':
      return 'プラン情報の取得に失敗しました。ネットワーク接続を確認してください。';
    case 'not_configured':
      return '現在サブスクリプション機能を利用できません。';
    case 'none':
      return null;
  }
}

/**
 * Returns the empty-state message for the no-offerings UI.
 *
 * @param offeringsError - error message from a failed getOfferings() call, or null
 * @returns the message to display — offeringsError if fetch failed, or a generic
 *          "plans unavailable" message if fetch succeeded but no packages exist
 */
export function getEmptyStateMessage(offeringsError: string | null): string {
  return offeringsError ?? '現在利用可能なプランがありません。しばらくしてからお試しください。';
}
