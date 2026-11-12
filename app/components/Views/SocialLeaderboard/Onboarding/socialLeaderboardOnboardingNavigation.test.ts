import Routes from '../../../../constants/navigation/Routes';
import ReduxService from '../../../../core/redux';
import type { RootState } from '../../../../reducers';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
import { selectAiSocialLeaderboardOnboardingEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { resolveABTestAssignment } from '../../../../util/abTest';
import { hasAcceptedSocialTerms } from '../terms/socialTermsAcceptance';
import {
  canOpenSocialTabDirectly,
  finishProfileOnboardingToSocialTab,
  popToSocialTab,
  getFollowTradingHomeRoute,
  hasSeenSocialLeaderboardOnboarding,
  isSocialV1Treatment,
  navigateToSocialLeaderboard,
  navigateToSocialTab,
  pushSocialLeaderboard,
  resetSocialLeaderboardOnboardingSeen,
  shouldShowSocialLeaderboardOnboarding,
} from './socialLeaderboardOnboardingNavigation';

jest.mock('../terms/socialTermsAcceptance', () => ({
  ...jest.requireActual('../terms/__mocks__/socialTermsAcceptance'),
  hasAcceptedSocialTerms: jest.fn(() => true),
}));
jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: { getItemSync: jest.fn(), removeItem: jest.fn() },
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectAiSocialLeaderboardOnboardingEnabled: jest.fn(),
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
const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockRemoveItem = jest.mocked(StorageWrapper.removeItem);
const mockOnboardingEnabled = jest.mocked(
  selectAiSocialLeaderboardOnboardingEnabled,
);

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
    mockOnboardingEnabled.mockReturnValue(true);
    mockGetItemSync.mockReturnValue(null);
    mockResolveABTestAssignment.mockReturnValue({
      variantName: 'control',
      isActive: false,
    });
  });

  describe('shouldShowSocialLeaderboardOnboarding', () => {
    it('returns true when enabled and not previously seen', () => {
      mockGetItemSync.mockReturnValue(null);
      expect(shouldShowSocialLeaderboardOnboarding()).toBe(true);
      expect(mockGetItemSync).toHaveBeenCalledWith(
        SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      );
    });

    it('returns false when the onboarding has already been seen', () => {
      mockGetItemSync.mockReturnValue('true');
      expect(shouldShowSocialLeaderboardOnboarding()).toBe(false);
    });

    it('returns false when the onboarding flag is off (without reading storage)', () => {
      mockOnboardingEnabled.mockReturnValue(false);
      expect(shouldShowSocialLeaderboardOnboarding()).toBe(false);
      expect(mockGetItemSync).not.toHaveBeenCalled();
    });
  });

  describe('navigateToSocialLeaderboard', () => {
    it('navigates to the onboarding for a first-time user', () => {
      mockGetItemSync.mockReturnValue(null);
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.ONBOARDING);
    });

    it('navigates to the leaderboard with the source when onboarding is not due', () => {
      mockGetItemSync.mockReturnValue('true');
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, {
        source: 'home_carousel',
      });
    });

    it('navigates to the leaderboard without params when none are provided', () => {
      mockGetItemSync.mockReturnValue('true');
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate);

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined);
    });

    it('selects the Social tab for the TSA-1122 treatment instead of pushing Social V1', () => {
      mockGetItemSync.mockReturnValue('true');
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
      mockGetItemSync.mockReturnValue('true');
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

    it('returns a first-time TSA-1122 treatment user to the Social tab after onboarding', () => {
      mockGetItemSync.mockReturnValue(null);
      enableSocialV1();
      mockCreatedSocialProfile();
      const navigate = jest.fn();

      navigateToSocialLeaderboard(navigate, { source: 'home_carousel' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.ONBOARDING, {
        returnToTab: true,
      });
    });
  });

  describe('pushSocialLeaderboard', () => {
    it('navigates to the onboarding without returning to the tab for a first-time TSA-1122 treatment user', () => {
      mockGetItemSync.mockReturnValue(null);
      enableSocialV1();
      mockCreatedSocialProfile();
      const navigate = jest.fn();

      pushSocialLeaderboard(navigate, { source: 'perps_home' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.ONBOARDING);
    });

    it('pushes the Social V1 route with the initial tab for the TSA-1122 treatment', () => {
      mockGetItemSync.mockReturnValue('true');
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
      mockGetItemSync.mockReturnValue('true');
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
    it('navigates to the onboarding for a first-time user', () => {
      mockGetItemSync.mockReturnValue(null);
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(
        Routes.SOCIAL.ONBOARDING,
        undefined,
      );
    });

    it('returns to the Social tab after V1 treatment onboarding', () => {
      mockGetItemSync.mockReturnValue(null);
      enableSocialV1();
      mockCreatedSocialProfile();
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.ONBOARDING, {
        returnToTab: true,
      });
    });

    it('selects the Social tab with the source when onboarding is not due', () => {
      mockGetItemSync.mockReturnValue('true');
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.TAB, {
        source: 'nav_tab',
      });
    });

    it('does not push the stack V0 or V1 home routes', () => {
      mockGetItemSync.mockReturnValue('true');
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
      mockGetItemSync.mockReturnValue('true');
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

    it('opens profile onboarding before the old leaderboard introduction', () => {
      mockGetItemSync.mockReturnValue(null);
      const navigate = jest.fn();

      navigateToSocialTab(navigate, { source: 'nav_tab' });

      expectProfileOnboarding(navigate);
      expect(navigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.ONBOARDING,
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

  describe('canOpenSocialTabDirectly', () => {
    it('is true for Social V1 once terms, profile and onboarding are done', () => {
      enableSocialV1();
      mockCreatedSocialProfile();
      mockGetItemSync.mockReturnValue('true');

      expect(canOpenSocialTabDirectly()).toBe(true);
    });

    it('is false for Social V1 when the terms are not accepted', () => {
      enableSocialV1();
      mockCreatedSocialProfile();
      mockGetItemSync.mockReturnValue('true');
      jest.mocked(hasAcceptedSocialTerms).mockReturnValueOnce(false);

      expect(canOpenSocialTabDirectly()).toBe(false);
    });

    it('is false for Social V1 when no profile exists', () => {
      enableSocialV1();
      mockGetItemSync.mockReturnValue('true');

      expect(canOpenSocialTabDirectly()).toBe(false);
    });

    it('is false while the leaderboard onboarding is still due', () => {
      enableSocialV1();
      mockCreatedSocialProfile();
      mockGetItemSync.mockReturnValue(null);

      expect(canOpenSocialTabDirectly()).toBe(false);
    });

    it('ignores the V1 terms and profile gates for control', () => {
      mockGetItemSync.mockReturnValue('true');

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

  describe('hasSeenSocialLeaderboardOnboarding', () => {
    it('returns true when the seen flag is persisted', () => {
      mockGetItemSync.mockReturnValue('true');
      expect(hasSeenSocialLeaderboardOnboarding()).toBe(true);
      expect(mockGetItemSync).toHaveBeenCalledWith(
        SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      );
    });

    it('returns false when the seen flag is absent', () => {
      mockGetItemSync.mockReturnValue(null);
      expect(hasSeenSocialLeaderboardOnboarding()).toBe(false);
    });
  });

  describe('resetSocialLeaderboardOnboardingSeen', () => {
    it('removes the persisted seen flag', async () => {
      mockRemoveItem.mockResolvedValue(undefined);

      await resetSocialLeaderboardOnboardingSeen();

      expect(mockRemoveItem).toHaveBeenCalledWith(
        SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      );
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
