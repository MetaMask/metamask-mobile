/* eslint-disable @typescript-eslint/no-deprecated */
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import ReactQueryService from '../../../../ReactQueryService';
import { handleSocialPostUrl } from '../handleSocialPostUrl';
import { navigateToSocialV1Profile } from '../../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { ensureSocialTermsAccepted } from '../../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance',
  () => ({ ensureSocialTermsAccepted: jest.fn(() => true) }),
);

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

jest.mock('../../../../ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      query: jest.fn(),
    },
  },
}));

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

const POSITION = { positionId: 'position-1', tokenSymbol: 'PEPE' };

const PROFILE_RESPONSE = {
  profile: {
    profileId: 'trader-1',
    address: '0xabc',
    name: 'satoshi',
    imageUrl: 'https://example.com/a.png',
  },
  stats: { winRate30d: 0.92, pnl30d: 1200, tradeCount30d: 30 },
  followerCount: 7,
};

// The handler fires its navigation from a floating promise.
const flushAsync = () => new Promise(process.nextTick);

describe('handleSocialPostUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
  const mockQuery = ReactQueryService.queryClient.query as jest.Mock;
  const mockNavigateToProfile = jest.mocked(navigateToSocialV1Profile);

  const resolveBothFetches = () => {
    mockQuery.mockImplementation(async ({ queryKey }) =>
      queryKey[0] === 'SocialService:fetchPositionById'
        ? POSITION
        : PROFILE_RESPONSE,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({ event: 'mocked' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(true);
    resolveBothFetches();
  });

  it('opens the post detail sheet with the fetched position and author', async () => {
    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'position-1',
      position: POSITION,
      author: {
        id: 'trader-1',
        username: 'satoshi',
        address: '0xabc',
        avatarUri: 'https://example.com/a.png',
        winRatePercent: 92,
        pnl30d: 1200,
        tradeCount30d: 30,
        followerCount: 7,
      },
    });
    expect(mockNavigateToProfile).not.toHaveBeenCalled();
  });

  it('fetches the author in parallel with the post', () => {
    mockQuery.mockReturnValue(new Promise(() => undefined));

    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(mockQuery).toHaveBeenCalledWith({
      queryKey: [
        'SocialService:fetchTraderProfile',
        { addressOrId: 'trader-1' },
      ],
    });
  });

  it('attributes the post to its real owner when the link trader does not own it', async () => {
    const ownedPosition = {
      ...POSITION,
      profileId: 'owner-1',
    };
    mockQuery.mockImplementation(async ({ queryKey }) => {
      if (queryKey[0] === 'SocialService:fetchPositionById') {
        return ownedPosition;
      }
      return queryKey[1].addressOrId === 'owner-1'
        ? {
            ...PROFILE_RESPONSE,
            profile: {
              profileId: 'owner-1',
              address: '0xowner',
              name: 'bob',
              imageUrl: null,
            },
          }
        : PROFILE_RESPONSE;
    });

    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();
    await flushAsync();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'position-1',
      position: ownedPosition,
      author: expect.objectContaining({ id: 'owner-1', username: 'bob' }),
    });
  });

  it('falls back to the profile when the post is hidden or removed', async () => {
    mockQuery.mockRejectedValue(new Error('404'));

    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();

    expect(mockNavigateToProfile).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION_SHEET,
      expect.anything(),
    );
  });

  it('falls back to the profile when the position resolves to nothing', async () => {
    mockQuery.mockResolvedValue(undefined);

    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();

    expect(mockNavigateToProfile).toHaveBeenCalledTimes(1);
  });

  it('falls back to the profile when the link carries no ids', async () => {
    handleSocialPostUrl({ actionPath: '' });
    await flushAsync();

    expect(mockNavigateToProfile).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('still opens the sheet with a degraded author when the profile fetch fails', async () => {
    mockQuery.mockImplementation(async ({ queryKey }) => {
      if (queryKey[0] === 'SocialService:fetchPositionById') {
        return POSITION;
      }
      throw new Error('profile unavailable');
    });

    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'position-1',
      position: POSITION,
      author: { id: 'trader-1', username: '', winRatePercent: null },
    });
  });

  it('forwards deduplication_id onto the notification click', async () => {
    handleSocialPostUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&deduplication_id=dedup-1&notification_subtype=your_trader_was_copied',
    });
    await flushAsync();

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'your_trader_was_copied',
      deduplication_id: 'dedup-1',
    });
  });

  it('tracks the notification click with its subtype', async () => {
    handleSocialPostUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=your_trader_was_copied&notification_template_variant=v1',
    });
    await flushAsync();

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        notification_subtype: 'your_trader_was_copied',
        notification_template_variant: 'v1',
      }),
    );
  });

  it('does not track a click for a link that did not come from a notification', async () => {
    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();

    expect(mockAddProperties).not.toHaveBeenCalled();
  });

  it('opens the post once the Social terms are accepted', async () => {
    jest.mocked(ensureSocialTermsAccepted).mockReturnValueOnce(false);

    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();
    expect(mockNavigate).not.toHaveBeenCalled();
    const onAccepted = jest.mocked(ensureSocialTermsAccepted).mock
      .calls[0]?.[1];
    expect(onAccepted).toEqual(expect.any(Function));
    onAccepted?.();
    await flushAsync();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION_SHEET,
      expect.objectContaining({ positionId: 'position-1' }),
    );
  });

  it('does not open the post when the Social terms are not accepted', async () => {
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(false);

    handleSocialPostUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });
    await flushAsync();

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockNavigateToProfile).not.toHaveBeenCalled();
  });
});
