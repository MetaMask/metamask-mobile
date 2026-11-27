/* eslint-disable @typescript-eslint/no-deprecated */
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import { handleSocialPostDecisionUrl } from '../handleSocialPostDecisionUrl';
import { navigateToSocialV1Profile } from '../../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { trackSocialNotificationClick } from '../socialNotificationDeeplink';

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile',
  () => ({ navigateToSocialV1Profile: jest.fn() }),
);

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../socialNotificationDeeplink', () => ({
  ...jest.requireActual('../socialNotificationDeeplink'),
  trackSocialNotificationClick: jest.fn(),
}));

describe('handleSocialPostDecisionUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
  const mockNavigateToProfile = jest.mocked(navigateToSocialV1Profile);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the decision screen with everything the link describes', () => {
    handleSocialPostDecisionUrl({
      actionPath:
        '/social/post/decision?kind=report-post-removed&handle=alphawhale&text=100x%20guaranteed&reason=Promises%20guaranteed%20returns&postedAt=1763460000000&verified=true&profileId=profile-1&avatarUrl=https%3A%2F%2Fexample.com%2Fa.png',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POST_DECISION, {
      kind: 'report-post-removed',
      handle: 'alphawhale',
      text: '100x guaranteed',
      reason: 'Promises guaranteed returns',
      postedAt: 1763460000000,
      avatarUrl: 'https://example.com/a.png',
      profileId: 'profile-1',
      verified: true,
    });
    expect(mockNavigateToProfile).not.toHaveBeenCalled();
  });

  it('opens a hidden profile without any post text', () => {
    handleSocialPostDecisionUrl({
      actionPath:
        '/social/post/decision?kind=profile-hidden&handle=alphawhale&reason=Impersonation',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POST_DECISION,
      expect.objectContaining({ kind: 'profile-hidden', text: undefined }),
    );
  });

  it('opens a position-only post, which has no text', () => {
    handleSocialPostDecisionUrl({
      actionPath:
        '/social/post/decision?kind=report-post-removed&handle=alphawhale&reason=Financial%20conduct',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POST_DECISION,
      expect.objectContaining({ kind: 'report-post-removed', text: undefined }),
    );
    expect(mockNavigateToProfile).not.toHaveBeenCalled();
  });

  it('attributes the open to the notification that carried the link', () => {
    handleSocialPostDecisionUrl({
      actionPath:
        '/social/post/decision?handle=alphawhale&text=hi&reason=spam&notification_subtype=post_removed&deduplication_id=dedup-1&notification_template_variant=a',
    });

    expect(trackSocialNotificationClick).toHaveBeenCalledWith({
      notificationSubtype: 'post_removed',
      deduplicationId: 'dedup-1',
      notificationTemplateVariant: 'a',
    });
  });

  it.each([
    ['the handle', '/social/post/decision?text=hi&reason=spam'],
    ['the reason', '/social/post/decision?handle=alphawhale&text=hi'],
    ['every param', '/social/post/decision'],
    [
      'a known kind',
      '/social/post/decision?kind=banned&handle=alphawhale&text=hi&reason=spam',
    ],
  ])('falls back to the profile when the link lacks %s', (_, actionPath) => {
    handleSocialPostDecisionUrl({ actionPath });

    expect(mockNavigateToProfile).toHaveBeenCalledWith(
      NavigationService.navigation,
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back to the profile when navigating throws', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('navigator not ready');
    });

    handleSocialPostDecisionUrl({
      actionPath: '/social/post/decision?handle=alphawhale&text=hi&reason=spam',
    });

    expect(mockNavigateToProfile).toHaveBeenCalledWith(
      NavigationService.navigation,
    );
  });
});
