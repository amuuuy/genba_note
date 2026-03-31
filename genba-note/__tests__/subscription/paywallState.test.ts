/**
 * PaywallState transition tests
 *
 * Verifies the pure state machine that manages paywall error states:
 * - offeringsError (persistent, from fetch failure)
 * - error (dismissible, from purchase/restore failure)
 *
 * Key invariants:
 * - dismissError only clears `error`, never `offeringsError`
 * - offeringsError persists through all state transitions
 */

import {
  initialErrorState,
  setOfferingsError,
  setOperationError,
  dismissError,
  clearOfferingsError,
} from '../../app/paywallState';

describe('paywallState transitions', () => {
  describe('initial state', () => {
    it('has no errors', () => {
      expect(initialErrorState.offeringsError).toBeNull();
      expect(initialErrorState.error).toBeNull();
    });
  });

  describe('fetch failure → dismiss cycle (isConfigured=false)', () => {
    const sdkNotConfiguredMsg = '現在サブスクリプション機能を利用できません。';

    it('setOfferingsError sets persistent error', () => {
      const state = setOfferingsError(initialErrorState, sdkNotConfiguredMsg);
      expect(state.offeringsError).toBe(sdkNotConfiguredMsg);
      expect(state.error).toBeNull();
    });

    it('dismissError does NOT clear offeringsError', () => {
      const state1 = setOfferingsError(initialErrorState, sdkNotConfiguredMsg);
      const state2 = dismissError(state1);
      expect(state2.offeringsError).toBe(sdkNotConfiguredMsg);
      expect(state2.error).toBeNull();
    });

    it('offeringsError survives multiple dismiss cycles', () => {
      let state = setOfferingsError(initialErrorState, sdkNotConfiguredMsg);
      state = dismissError(state);
      state = dismissError(state);
      expect(state.offeringsError).toBe(sdkNotConfiguredMsg);
    });
  });

  describe('fetch failure → dismiss cycle (isConfigured=true)', () => {
    const networkMsg = 'プラン情報の取得に失敗しました。ネットワーク接続を確認してください。';

    it('preserves network error message after dismiss', () => {
      const state1 = setOfferingsError(initialErrorState, networkMsg);
      const state2 = dismissError(state1);
      expect(state2.offeringsError).toBe(networkMsg);
    });
  });

  describe('fetch success but no packages', () => {
    it('offeringsError stays null when fetch succeeds', () => {
      // No setOfferingsError call — fetch succeeded
      expect(initialErrorState.offeringsError).toBeNull();
    });

    it('offeringsError is null even after dismiss', () => {
      const state = dismissError(initialErrorState);
      expect(state.offeringsError).toBeNull();
    });
  });

  describe('clearOfferingsError (retry preparation)', () => {
    const networkMsg = 'プラン情報の取得に失敗しました。ネットワーク接続を確認してください。';

    it('clears offeringsError back to null', () => {
      const state = setOfferingsError(initialErrorState, networkMsg);
      const cleared = clearOfferingsError(state);
      expect(cleared.offeringsError).toBeNull();
    });

    it('preserves existing operation error when clearing offeringsError', () => {
      let state = setOfferingsError(initialErrorState, networkMsg);
      state = setOperationError(state, '購入処理中にエラーが発生しました。');
      const cleared = clearOfferingsError(state);
      expect(cleared.offeringsError).toBeNull();
      expect(cleared.error).toBe('購入処理中にエラーが発生しました。');
    });

    it('is a no-op when offeringsError is already null', () => {
      const cleared = clearOfferingsError(initialErrorState);
      expect(cleared.offeringsError).toBeNull();
      expect(cleared.error).toBeNull();
    });
  });

  describe('operation error + offerings error coexistence', () => {
    it('can have both offeringsError and operation error', () => {
      let state = setOfferingsError(initialErrorState, '現在サブスクリプション機能を利用できません。');
      state = setOperationError(state, '購入処理中にエラーが発生しました。');
      expect(state.offeringsError).toBe('現在サブスクリプション機能を利用できません。');
      expect(state.error).toBe('購入処理中にエラーが発生しました。');
    });

    it('dismissError clears only operation error, preserves offeringsError', () => {
      let state = setOfferingsError(initialErrorState, '現在サブスクリプション機能を利用できません。');
      state = setOperationError(state, '購入処理中にエラーが発生しました。');
      state = dismissError(state);
      expect(state.offeringsError).toBe('現在サブスクリプション機能を利用できません。');
      expect(state.error).toBeNull();
    });
  });
});
