import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { handleSocialTraderUrl } from '../handleSocialTraderUrl';
import { navigateToSocialV1Profile } from '../../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { isSocialV1Treatment } from '../../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile',
  () => ({
    navigateToSocialV1Profile: jest.fn(),
  }),
);

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({
    getFollowTradingHomeRoute: () => 'SocialV0View',
    isSocialV1Treatment: jest.fn(() => false),
  }),
);

describe('handleSocialTraderUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
  const mockIsSocialV1Treatment = jest.mocked(isSocialV1Treatment);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialV1Treatment.mockReturnValue(false);
  });

  it('opens the V0 trader profile when the Social V1 flag is control', () => {
    handleSocialTraderUrl({ actionPath: '?traderId=trader-1' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE, {
      traderId: 'trader-1',
      traderName: '',
      source: 'deep_link',
    });
    expect(navigateToSocialV1Profile).not.toHaveBeenCalled();
  });

  it('opens the V1 trader profile when the Social V1 flag is treatment', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);

    handleSocialTraderUrl({ actionPath: '?traderId=trader-1' });

    expect(navigateToSocialV1Profile).toHaveBeenCalledWith(
      NavigationService.navigation,
      {
        traderId: 'trader-1',
        source: 'deep_link',
      },
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('decodes an encoded traderId', () => {
    handleSocialTraderUrl({
      actionPath: '?traderId=trader%20id%2Fwith%20reserved%3Fchars',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.PROFILE,
      expect.objectContaining({
        traderId: 'trader id/with reserved?chars',
      }),
    );
  });

  it('falls back to Social home when traderId is missing', () => {
    handleSocialTraderUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleSocialTraderUrl] Missing traderId, falling back to social home',
    );
  });

  it('falls back to Social home when traderId is blank', () => {
    handleSocialTraderUrl({ actionPath: '?traderId=%20%20' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
  });

  it('falls back to Social home when navigation throws', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation failed');
    });

    handleSocialTraderUrl({ actionPath: '?traderId=trader-1' });

    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
  });
});
