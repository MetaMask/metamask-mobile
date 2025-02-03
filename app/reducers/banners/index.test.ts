import { REHYDRATE } from 'redux-persist';
import bannersReducer, { BannersState } from './index';
import { dismissBanner } from '../../actions/banners';

describe('bannersReducer', () => {
  const initialState: BannersState = {
    dismissedBanners: [],
  };

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

    expect(
      bannersReducer(initialState, {
        type: REHYDRATE,
        payload: { banners: rehydratedState },
      }),
    ).toEqual(rehydratedState);
  });

  it('should maintain current state if REHYDRATE action has no banners data', () => {
    const currentState = {
      dismissedBanners: ['existing-banner-1'],
    };

    expect(
      bannersReducer(currentState, {
        type: REHYDRATE,
        payload: {},
      }),
    ).toEqual(currentState);
  });
});
