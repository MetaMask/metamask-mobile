import NavigationService from '../../../../NavigationService';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { navigateToSocialLeaderboard } from '../../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { handleSocialLeaderboardUrl } from '../handleSocialLeaderboardUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
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

  it('routes into Social home through the onboarding gate when no tab is present', () => {
    handleSocialLeaderboardUrl();

    expect(navigateToSocialLeaderboard).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      undefined,
    );
  });

  it.each([
    ['trending', 'trending'],
    ['following', 'following'],
    ['leaderboard', 'leaderboard'],
    ['live-trades', 'live'],
    ['LIVE-TRADES', 'live'],
  ] as const)('forwards tab %s as initialTab %s', (tab, initialTab) => {
    handleSocialLeaderboardUrl({ actionPath: `?tab=${tab}` });

    expect(navigateToSocialLeaderboard).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      { initialTab },
    );
  });

  it('drops an unknown tab so V1 stays on trending', () => {
    handleSocialLeaderboardUrl({ actionPath: '?tab=feed' });

    expect(navigateToSocialLeaderboard).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      undefined,
    );
  });

  it('ignores unrelated query params', () => {
    handleSocialLeaderboardUrl({ actionPath: '?ignored=true' });

    expect(navigateToSocialLeaderboard).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      undefined,
    );
  });

  it('falls back to Social home when parsing throws', () => {
    (navigateToSocialLeaderboard as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Navigation failed');
    });

    handleSocialLeaderboardUrl({ actionPath: '?tab=trending' });

    expect(navigateToSocialLeaderboard).toHaveBeenLastCalledWith(
      NavigationService.navigation.navigate,
    );
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleSocialLeaderboardUrl] Failed to handle deeplink:',
      expect.any(Error),
    );
  });
});
