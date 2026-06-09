import bannersReducer, {
  BannersState,
  dismissBanner,
  setLastDismissedBrazeBanner,
} from './index';
import { Action } from '@reduxjs/toolkit';

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    banners?: BannersState;
  };
}

describe('bannersReducer', () => {
  const initialState: BannersState = {
    dismissedBanners: [],
    lastDismissedBrazeBanner: null,
  };

  describe('action creators', () => {
    it('should create a dismissBanner action with the correct payload', () => {
      const bannerId = 'test-banner-1';
      const action = dismissBanner(bannerId);

      expect(action.type).toBe('banners/dismissBanner');
      expect(action.payload).toBe(bannerId);
    });

    it('should create a setLastDismissedBrazeBanner action with the correct payload', () => {
      const action = setLastDismissedBrazeBanner('tracking-xyz');

      expect(action.type).toBe('banners/setLastDismissedBrazeBanner');
      expect(action.payload).toBe('tracking-xyz');
    });

    it('should create a setLastDismissedBrazeBanner action with null payload', () => {
      const action = setLastDismissedBrazeBanner(null);

      expect(action.type).toBe('banners/setLastDismissedBrazeBanner');
      expect(action.payload).toBeNull();
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
      const expectedState: BannersState = {
        dismissedBanners: [bannerId],
        lastDismissedBrazeBanner: null,
      };

      expect(bannersReducer(initialState, dismissBanner(bannerId))).toEqual(
        expectedState,
      );
    });

    it('should not add duplicate banner ids to dismissedBanners', () => {
      const bannerId = 'test-banner-1';
      const stateWithDismissedBanner: BannersState = {
        dismissedBanners: [bannerId],
        lastDismissedBrazeBanner: null,
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
        lastDismissedBrazeBanner: null,
      });
    });

    it('should set lastDismissedBrazeBanner', () => {
      const state = bannersReducer(
        initialState,
        setLastDismissedBrazeBanner('tracking-abc'),
      );

      expect(state.lastDismissedBrazeBanner).toBe('tracking-abc');
      expect(state.dismissedBanners).toEqual([]);
    });

    it('should overwrite lastDismissedBrazeBanner with a new value', () => {
      const stateAfterFirst = bannersReducer(
        initialState,
        setLastDismissedBrazeBanner('first-banner'),
      );
      const stateAfterSecond = bannersReducer(
        stateAfterFirst,
        setLastDismissedBrazeBanner('second-banner'),
      );

      expect(stateAfterSecond.lastDismissedBrazeBanner).toBe('second-banner');
    });

    it('should reset lastDismissedBrazeBanner to null', () => {
      const stateWithDismissed = bannersReducer(
        initialState,
        setLastDismissedBrazeBanner('some-banner'),
      );
      const stateAfterClear = bannersReducer(
        stateWithDismissed,
        setLastDismissedBrazeBanner(null),
      );

      expect(stateAfterClear.lastDismissedBrazeBanner).toBeNull();
    });

    describe('REHYDRATE action', () => {
      it('should handle REHYDRATE action with banners data', () => {
        const rehydratedState: BannersState = {
          dismissedBanners: ['rehydrated-banner-1'],
          lastDismissedBrazeBanner: 'last-braze-banner',
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
        const currentState: BannersState = {
          dismissedBanners: ['existing-banner-1'],
          lastDismissedBrazeBanner: null,
        };

        const rehydrateAction: RehydrateAction = {
          type: 'persist/REHYDRATE',
          payload: {},
        };

        expect(bannersReducer(currentState, rehydrateAction)).toEqual(
          currentState,
        );
      });

      it('should default lastDismissedBrazeBanner to null when rehydrating from pre-migration state', () => {
        // Simulate an older persisted state that lacks the field
        const legacyState = {
          dismissedBanners: ['old-banner'],
          // lastDismissedBrazeBanner not present (pre-migration)
        } as unknown as BannersState;

        const rehydrateAction: RehydrateAction = {
          type: 'persist/REHYDRATE',
          payload: { banners: legacyState },
        };

        const result = bannersReducer(initialState, rehydrateAction);

        expect(result.dismissedBanners).toEqual(['old-banner']);
        expect(result.lastDismissedBrazeBanner).toBeNull();
      });
    });
  });
});
