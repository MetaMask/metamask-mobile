import NavigationService from '../../../../NavigationService';
import { navigateToSocialLeaderboard } from '../../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { handleSocialLeaderboardUrl } from '../handleSocialLeaderboardUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({
    navigateToSocialLeaderboard: jest.fn(),
  }),
);

describe('handleSocialLeaderboardUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes into the Social Leaderboard through the onboarding gate', () => {
    handleSocialLeaderboardUrl();

    // The helper decides synchronously whether to open onboarding or the
    // leaderboard, so first-time users land on onboarding as the first screen.
    expect(navigateToSocialLeaderboard).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
    );
  });
});
