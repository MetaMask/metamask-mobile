import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../../core/redux';
import type { RootState } from '../../../../reducers';
import { resolveABTestAssignment } from '../../../../util/abTest';
import {
  ensureSocialTermsAccepted,
  hasAcceptedSocialTerms,
} from '../terms/socialTermsAcceptance';
import {
  canOpenSocialTabDirectly,
  finishProfileOnboardingToSocialTab,
  popToSocialTab,
  getFollowTradingHomeRoute,
  isSocialV1Treatment,
  navigateToSocialLeaderboard,
  navigateToSocialTab,
  pushSocialLeaderboard,
} from './socialLeaderboardOnboardingNavigation';

jest.mock('../terms/socialTermsAcceptance', () => ({
  ...jest.requireActual('../terms/__mocks__/socialTermsAcceptance'),
  ensureSocialTermsAccepted: jest.fn(() => true),
  hasAcceptedSocialTerms: jest.fn(() => true),
}));
jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(),
  }),
);

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

const mockCreatedSocialProfile = (profileId = 'profile-1') => {
  mockGetState.mockReturnValue({
    engine: {
      backgroundState: {
        ProfileController: { profile: { profileId } },
      },
    },
  } as unknown as RootState);
};

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
    it('navigates to the leaderboard with the source', () => {
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
      mockCreatedSocialProfile();
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
      mockCreatedSocialProfile();
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
      mockCreatedSocialProfile();
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
      mockCreatedSocialProfile();
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

  describe('Social V1 profile gate', () => {
    const expectProfileOnboarding = (navigate: jest.Mock) => {
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.PROFILE_ONBOARDING,
        expect.anything(),
      );
    };

    beforeEach(() => {
      enableSocialV1();
    });

    it('opens profile onboarding from Top traders when terms are accepted and no profile exists', () => {
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expectProfileOnboarding(navigate);
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.HOME_TABS,
        expect.anything(),
        expect.anything(),
      );
    });

    it('opens profile onboarding from the Social tab when terms are accepted and no profile exists', () => {
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expectProfileOnboarding(navigate);
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.TAB,
        expect.anything(),
      );
    });

    it('opens profile onboarding from Perps when terms are accepted and no profile exists', () => {
      const navigate = jest.fn();

      pushSocialLeaderboard(navigate, { source: 'perps_home' });

      expectProfileOnboarding(navigate);
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.V1,
        expect.anything(),
      );
    });

    it('treats a blank profile id as a profile that has not been created', () => {
      mockCreatedSocialProfile('   ');
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expectProfileOnboarding(navigate);
    });

    it('keeps the legacy leaderboard path when Social V1 is not assigned', () => {
      mockResolveABTestAssignment.mockReturnValue({
        variantName: 'control',
        isActive: false,
      });
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.TAB, {
        source: 'nav_tab',
      });
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.PROFILE_ONBOARDING,
      );
    });
  });

  describe('after the Social terms are accepted', () => {
    const acceptTermsAndContinue = () => {
      const onAccepted = jest.mocked(ensureSocialTermsAccepted).mock
        .calls[0]?.[1];
      expect(onAccepted).toEqual(expect.any(Function));
      onAccepted?.();
    };

    beforeEach(() => {
      enableSocialV1();
      mockCreatedSocialProfile();
      jest.mocked(ensureSocialTermsAccepted).mockReturnValueOnce(false);
    });

    it('opens the Social tab from the tab bar', () => {
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });
      expect(navigate).not.toHaveBeenCalled();
      acceptTermsAndContinue();

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.TAB, {
        source: 'nav_tab',
      });
    });

    it('opens the Social tab from Top traders', () => {
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });
      expect(navigate).not.toHaveBeenCalled();
      acceptTermsAndContinue();

      expect(navigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        { screen: Routes.SOCIAL.TAB, params: { source: 'home_carousel' } },
        { pop: true },
      );
    });

    it('pushes Social from Perps', () => {
      const navigate = jest.fn();

      pushSocialLeaderboard(navigate, { source: 'perps_home' });
      expect(navigate).not.toHaveBeenCalled();
      acceptTermsAndContinue();

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V1, {
        source: 'perps_home',
      });
    });
  });

  describe('canOpenSocialTabDirectly', () => {
    it('is true for Social V1 once the terms and profile are done', () => {
      enableSocialV1();
      mockCreatedSocialProfile();

      expect(canOpenSocialTabDirectly()).toBe(true);
    });

    it('is false for Social V1 when the terms are not accepted', () => {
      enableSocialV1();
      mockCreatedSocialProfile();
      jest.mocked(hasAcceptedSocialTerms).mockReturnValueOnce(false);

      expect(canOpenSocialTabDirectly()).toBe(false);
    });

    it('is false for Social V1 when no profile exists', () => {
      enableSocialV1();

      expect(canOpenSocialTabDirectly()).toBe(false);
    });

    it('ignores the V1 terms and profile gates for control', () => {
      expect(canOpenSocialTabDirectly()).toBe(true);
    });
  });

  describe('getFollowTradingHomeRoute', () => {
    it('returns the legacy home route for control', () => {
      expect(getFollowTradingHomeRoute()).toBe(Routes.SOCIAL.V0);
    });

    it('returns the v1 home route for treatment', () => {
      mockResolveABTestAssignment.mockReturnValue({
        variantName: 'treatment',
        isActive: true,
      });

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
