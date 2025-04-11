import bannersReducer, { BannersState, dismissBanner } from './index';
import { Action } from '@reduxjs/toolkit';

// Define the type for the REHYDRATE action
interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    banners?: BannersState;
  };
}

describe('bannersReducer', () => {
  const initialState: BannersState = {
    dismissedBanners: [],
  };

  describe('action creators', () => {
    it('should create a dismissBanner action with the correct payload', () => {
      const bannerId = 'test-banner-1';
      const action = dismissBanner(bannerId);

      expect(action.type).toBe('banners/dismissBanner');
      expect(action.payload).toBe(bannerId);
    });
  });

  describe('reducer', () => {
    it('should return initial state', () => {
      expect(bannersReducer(undefined, { type: 'DUMMY_ACTION' })).toEqual(
        initialState,
      );
    });

    it('should handle dismissing a banner', () => {
      const bannerId = 'test-banner-1';
      const expectedState = {
        dismissedBanners: [bannerId],
      };

      expect(bannersReducer(initialState, dismissBanner(bannerId))).toEqual(
        expectedState,
      );
    });

    it('should not add duplicate banner ids to dismissedBanners', () => {
      const bannerId = 'test-banner-1';
      const stateWithDismissedBanner = {
        dismissedBanners: [bannerId],
      };

      expect(
        bannersReducer(stateWithDismissedBanner, dismissBanner(bannerId)),
      ).toEqual(stateWithDismissedBanner);
    });

    it('should handle multiple banner dismissals', () => {
      const bannerId1 = 'test-banner-1';
      const bannerId2 = 'test-banner-2';
      const intermediateState = bannersReducer(
        initialState,
        dismissBanner(bannerId1),
      );
      const finalState = bannersReducer(
        intermediateState,
        dismissBanner(bannerId2),
      );

      expect(finalState).toEqual({
        dismissedBanners: [bannerId1, bannerId2],
      });
    });

    it('should handle REHYDRATE action with banners data', () => {
      const rehydratedState = {
        dismissedBanners: ['rehydrated-banner-1'],
      };

      const rehydrateAction: RehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: { banners: rehydratedState },
      };

      expect(bannersReducer(initialState, rehydrateAction)).toEqual(
        rehydratedState,
      );
    });

    it('should maintain current state if REHYDRATE action has no banners data', () => {
      const currentState = {
        dismissedBanners: ['existing-banner-1'],
      };

      const rehydrateAction: RehydrateAction = {
        type: 'persist/REHYDRATE',
        payload: {},
      };

      expect(bannersReducer(currentState, rehydrateAction)).toEqual(
        currentState,
      );
    });
  });
});
