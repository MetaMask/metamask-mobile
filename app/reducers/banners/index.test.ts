import bannersReducer, { BannersState, dismissBanner } from './index';
import { Action } from '@reduxjs/toolkit';

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    banners?: BannersState & { lastDismissedBrazeBanner?: string | null };
  };
}

describe('bannersReducer', () => {
  const initialState: BannersState = {
    dismissedBanners: [],
  };

  describe('action creators', () => {
    it('creates a dismissBanner action with the banner id', () => {
      const bannerId = 'test-banner-1';
      const action = dismissBanner(bannerId);

      expect(action.type).toBe('banners/dismissBanner');
      expect(action.payload).toBe(bannerId);
    });
  });

  describe('reducer', () => {
    it('returns initial state', () => {
      expect(bannersReducer(undefined, { type: 'DUMMY_ACTION' })).toEqual(
        initialState,
      );
    });

    it('adds a banner id to dismissedBanners', () => {
      const bannerId = 'test-banner-1';
      const expectedState: BannersState = {
        dismissedBanners: [bannerId],
      };

      expect(bannersReducer(initialState, dismissBanner(bannerId))).toEqual(
        expectedState,
      );
    });

    it('does not add duplicate banner ids to dismissedBanners', () => {
      const bannerId = 'test-banner-1';
      const stateWithDismissedBanner: BannersState = {
        dismissedBanners: [bannerId],
      };

      expect(
        bannersReducer(stateWithDismissedBanner, dismissBanner(bannerId)),
      ).toEqual(stateWithDismissedBanner);
    });

    it('appends additional banner ids to dismissedBanners', () => {
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

    describe('REHYDRATE action', () => {
      it('restores dismissedBanners from persisted banners data', () => {
        const rehydratedState: BannersState = {
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

      it('keeps current state if REHYDRATE action has no banners data', () => {
        const currentState: BannersState = {
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

      it('drops leftover lastDismissedBrazeBanner from persisted banners state', () => {
        const legacyState = {
          dismissedBanners: ['old-banner'],
          lastDismissedBrazeBanner: 'campaign-xyz',
        };

        const rehydrateAction: RehydrateAction = {
          type: 'persist/REHYDRATE',
          payload: { banners: legacyState },
        };

        const result = bannersReducer(initialState, rehydrateAction);

        expect(result).toEqual({
          dismissedBanners: ['old-banner'],
        });
        expect(result).not.toHaveProperty('lastDismissedBrazeBanner');
      });
    });
  });
});
