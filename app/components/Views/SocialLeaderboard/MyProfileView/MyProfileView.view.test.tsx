import '../../../../../tests/component-view/mocks';
import { act, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { renderMyProfileView } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import { CV_SOCIAL_PROFILE } from '../../../../../tests/component-view/presets/socialLeaderboard';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  setupLeaderboardApiMock,
  clearLeaderboardApiMock,
} from '../../../../../tests/component-view/api-mocking/socialLeaderboard';
import { MyProfileViewSelectorsIDs } from './MyProfileView.testIds';
import { resetResolvedSessionProfileIds } from './hooks/useMyProfile';

const engineWithState = Engine as unknown as { state: typeof Engine.state };

describeForPlatforms('MyProfileView verification', () => {
  beforeEach(() => {
    resetResolvedSessionProfileIds();
    setupLeaderboardApiMock({
      following: [],
      traderProfile: null,
      traderFeedItems: [],
      openPositions: [],
    });
  });

  afterEach(() => {
    clearLeaderboardApiMock();
    jest.restoreAllMocks();
    resetResolvedSessionProfileIds();
  });

  it('shows the verified badge when pull-to-refresh updates the controller profile', async () => {
    const originalEngineState = Engine.state;
    const initialProfile = CV_SOCIAL_PROFILE;
    let resolveInitialFetch: (profile: typeof initialProfile) => void = () =>
      undefined;
    jest
      .spyOn(Engine.context.AuthenticationController, 'getSessionProfile')
      .mockResolvedValue({
        identifierId: 'cv-identifier',
        profileId: initialProfile.profileId,
        canonicalProfileId: initialProfile.profileId,
        metaMetricsId: 'cv-metrics',
      });
    const fetchProfile = jest
      .spyOn(Engine.context.ProfileController, 'fetchAndUpdateProfile')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInitialFetch = resolve;
          }),
      )
      .mockClear();
    const { store, unmount } = renderMyProfileView();

    try {
      await waitFor(() => {
        expect(fetchProfile).toHaveBeenCalledWith(initialProfile.profileId);
      });
      await act(async () => {
        resolveInitialFetch(initialProfile);
      });
      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.DISPLAY_NAME),
      ).toHaveTextContent(initialProfile.displayName);
      expect(
        screen.getByTestId(MyProfileViewSelectorsIDs.HANDLE),
      ).toHaveTextContent(`@${initialProfile.username}`);
      expect(
        screen.queryByTestId(MyProfileViewSelectorsIDs.VERIFIED_BADGE),
      ).not.toBeOnTheScreen();

      fetchProfile.mockClear();
      fetchProfile.mockImplementationOnce(async () => {
        const verifiedProfile = { ...initialProfile, verified: true };
        engineWithState.state = {
          ...Engine.state,
          ProfileController: { profile: verifiedProfile },
        };
        store.dispatch(updateBgState({ key: 'ProfileController' }));
        return verifiedProfile;
      });

      act(() => {
        // Do not await the refresh spinner's minimum duration; verification
        // becomes visible as soon as the controller update reaches Redux.
        screen
          .getByTestId(MyProfileViewSelectorsIDs.SCROLL)
          .props.refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(MyProfileViewSelectorsIDs.VERIFIED_BADGE),
        ).toBeOnTheScreen();
      });
      expect(fetchProfile).toHaveBeenCalledWith(initialProfile.profileId);
      expect(fetchProfile).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
      engineWithState.state = originalEngineState;
    }
  });
});
