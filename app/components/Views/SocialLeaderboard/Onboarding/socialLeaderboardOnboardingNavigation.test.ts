import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../../core/redux';
import type { RootState } from '../../../../reducers';
import { resolveABTestAssignment } from '../../../../util/abTest';
import {
  finishProfileOnboardingToSocialTab,
  popToSocialTab,
  getFollowTradingHomeRoute,
  isSocialV1Treatment,
  navigateToSocialLeaderboard,
  navigateToSocialTab,
  pushSocialLeaderboard,
} from './socialLeaderboardOnboardingNavigation';

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));

jest.mock('../../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(() => ({})),
  selectFeatureFlagThresholdGroups: jest.fn(() => ({})),
}));

jest.mock('../../../../util/abTest', () => ({
  resolveABTestAssignment: jest.fn(() => ({
    variantName: 'control',
    isActive: false,
  })),
}));

const mockResolveABTestAssignment = jest.mocked(resolveABTestAssignment);
const mockGetState = jest.mocked(ReduxService.store.getState);

const enableSocialV1 = () => {
  mockResolveABTestAssignment.mockReturnValue({
    variantName: 'treatment',
    isActive: true,
  });
};

describe('socialLeaderboardOnboardingNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({} as unknown as RootState);
    mockResolveABTestAssignment.mockReturnValue({
      variantName: 'control',
      isActive: false,
    });
  });

  describe('navigateToSocialLeaderboard', () => {
    it('navigates to the leaderboard with the source for control', () => {
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, {
        source: 'home_carousel',
      });
    });

    it('navigates to the leaderboard without params when none are provided', () => {
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate);

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined);
    });

    it('selects the Social tab for the TSA-1122 treatment instead of pushing Social V1', () => {
      enableSocialV1();
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, {
        source: 'home_carousel',
        landingTab: 'feed',
        landingFeedAudience: 'all',
      });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        { screen: Routes.SOCIAL.TAB, params: { source: 'home_carousel' } },
        { pop: true },
      );
    });

    it('forwards the initial tab to the Social tab for the TSA-1122 treatment', () => {
      enableSocialV1();
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, {
        source: 'perps_home',
        initialTab: 'leaderboard',
      });

      expect(navigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.SOCIAL.TAB,
          params: { source: 'perps_home', initialTab: 'leaderboard' },
        },
        { pop: true },
      );
    });
  });

  describe('pushSocialLeaderboard', () => {
    it('pushes the Social V1 route with the initial tab for the TSA-1122 treatment', () => {
      enableSocialV1();
      const navigate = jest.fn();

      pushSocialLeaderboard(navigate, {
        source: 'perps_home',
        initialTab: 'leaderboard',
        landingTab: 'feed',
      });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V1, {
        source: 'perps_home',
        initialTab: 'leaderboard',
      });
    });

    it('pushes the legacy leaderboard with the params for control', () => {
      const navigate = jest.fn();

      pushSocialLeaderboard(navigate, {
        source: 'perps_home',
        landingTab: 'feed',
      });

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, {
        source: 'perps_home',
        landingTab: 'feed',
      });
    });
  });

  describe('navigateToSocialTab', () => {
    it('selects the Social tab with the source', () => {
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.TAB, {
        source: 'nav_tab',
      });
    });

    it('does not push the stack V0 or V1 home routes', () => {
      enableSocialV1();
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.TAB, {
        source: 'nav_tab',
      });
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.V1,
        expect.anything(),
      );
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.V0,
        expect.anything(),
      );
    });
  });

  describe('Social V1 browsing without terms or a profile', () => {
    beforeEach(() => {
      enableSocialV1();
    });

    it('opens the Social tab from the tab bar', () => {
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.TAB, {
        source: 'nav_tab',
      });
    });

    it('opens the Social tab from Top traders', () => {
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        { screen: Routes.SOCIAL.TAB, params: { source: 'home_carousel' } },
        { pop: true },
      );
    });

    it('pushes Social from Perps', () => {
      const navigate = jest.fn();

      pushSocialLeaderboard(navigate, { source: 'perps_home' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V1, {
        source: 'perps_home',
      });
    });

    it('never opens profile onboarding', () => {
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });
      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });
      pushSocialLeaderboard(navigate, { source: 'perps_home' });

      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.PROFILE_ONBOARDING,
        expect.anything(),
      );
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.PROFILE_ONBOARDING,
      );
    });
  });

  describe('getFollowTradingHomeRoute', () => {
    it('returns the legacy home route for control', () => {
      expect(getFollowTradingHomeRoute()).toBe(Routes.SOCIAL.V0);
    });

    it('returns the v1 home route for treatment', () => {
      enableSocialV1();

      expect(getFollowTradingHomeRoute()).toBe(Routes.SOCIAL.V1);
      expect(isSocialV1Treatment()).toBe(true);
    });
  });
});

describe('finishProfileOnboardingToSocialTab', () => {
  it('pops onboarding back to Home and selects the Social tab', () => {
    const navigate = jest.fn();

    finishProfileOnboardingToSocialTab({ navigate });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      { screen: Routes.SOCIAL.TAB },
      { pop: true },
    );
  });
});

describe('popToSocialTab', () => {
  it('pops the current flow back to Home and selects the Social tab', () => {
    const navigate = jest.fn();

    popToSocialTab({ navigate });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      { screen: Routes.SOCIAL.TAB },
      { pop: true },
    );
  });
});
