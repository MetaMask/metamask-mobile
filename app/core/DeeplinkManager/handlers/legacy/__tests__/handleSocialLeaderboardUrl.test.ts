import NavigationService from '../../../../NavigationService';
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

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockBuild = jest.fn().mockReturnValue({ event: 'mocked' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
jest.mock('../../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: (...args: unknown[]) => mockAddProperties(...args),
      build: (...args: unknown[]) => mockBuild(...args),
    }),
  },
}));

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

  it('does not emit a notification-click event for a plain (non-notification) open', () => {
    handleSocialLeaderboardUrl({ actionPath: '' });

    expect(mockAddProperties).not.toHaveBeenCalled();
    expect(navigateToSocialLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('emits a notification-click event with subtype and variant when present', () => {
    handleSocialLeaderboardUrl({
      actionPath:
        '?notification_subtype=leaderboard_weekly_update&notification_template_variant=new_week&deduplication_id=dedup-1',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'leaderboard_weekly_update',
      notification_template_variant: 'new_week',
    });
    expect(mockBuild).toHaveBeenCalledTimes(1);
    // Analytics never blocks navigation.
    expect(navigateToSocialLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('omits the variant from the event when the param is absent', () => {
    handleSocialLeaderboardUrl({
      actionPath: '?notification_subtype=leaderboard_weekly_update',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'leaderboard_weekly_update',
    });
  });

  it('still navigates when a notification param is malformed', () => {
    mockAddProperties.mockImplementationOnce(() => {
      throw new Error('analytics failure');
    });

    handleSocialLeaderboardUrl({
      actionPath: '?notification_subtype=leaderboard_weekly_update',
    });

    expect(navigateToSocialLeaderboard).toHaveBeenCalledTimes(1);
  });
});
