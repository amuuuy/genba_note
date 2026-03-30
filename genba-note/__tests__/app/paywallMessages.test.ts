/**
 * paywallMessages tests
 *
 * Tests the UI presentation functions that convert domain-level error kinds
 * into user-facing Japanese messages for the paywall screen.
 * No mocks needed — paywallMessages.ts only uses type imports from subscription layer.
 */

import { getOfferingsErrorMessage, getEmptyStateMessage } from '../../app/paywallMessages';

describe('getOfferingsErrorMessage', () => {
  it('returns network error message for "network" kind', () => {
    expect(getOfferingsErrorMessage('network')).toBe(
      'プラン情報の取得に失敗しました。ネットワーク接続を確認してください。',
    );
  });

  it('returns unavailable message for "not_configured" kind', () => {
    expect(getOfferingsErrorMessage('not_configured')).toBe(
      '現在サブスクリプション機能を利用できません。',
    );
  });

  it('returns null for "none" kind', () => {
    expect(getOfferingsErrorMessage('none')).toBeNull();
  });

  it('does not mention restart in any message', () => {
    expect(getOfferingsErrorMessage('network')).not.toContain('再起動');
    expect(getOfferingsErrorMessage('not_configured')).not.toContain('再起動');
  });
});

describe('getEmptyStateMessage', () => {
  it('returns the offeringsError when fetch failed (network)', () => {
    const msg = getEmptyStateMessage('プラン情報の取得に失敗しました。ネットワーク接続を確認してください。');
    expect(msg).toBe('プラン情報の取得に失敗しました。ネットワーク接続を確認してください。');
  });

  it('returns the offeringsError when fetch failed (not configured)', () => {
    const msg = getEmptyStateMessage('現在サブスクリプション機能を利用できません。');
    expect(msg).toBe('現在サブスクリプション機能を利用できません。');
  });

  it('returns generic plans-unavailable message when no error', () => {
    const msg = getEmptyStateMessage(null);
    expect(msg).toBe('現在利用可能なプランがありません。しばらくしてからお試しください。');
  });

  it('does not show network error when no error', () => {
    const msg = getEmptyStateMessage(null);
    expect(msg).not.toContain('ネットワーク');
  });
});
