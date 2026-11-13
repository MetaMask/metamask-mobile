/* eslint-disable @typescript-eslint/no-deprecated */
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import ReactQueryService from '../../../../ReactQueryService';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { handleSocialTraderPositionUrl } from '../handleSocialTraderPositionUrl';
import {
  isSocialV1Treatment,
  popToSocialTab,
} from '../../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation';
import { ensureSocialTermsAccepted } from '../../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import { navigateToSocialV1Profile } from '../../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile';
import { waitFor } from '@testing-library/react-native';
import { openSocialTraderPreviewIfNotJoined } from '../../../../../components/Views/SocialLeaderboard/TraderPreviewSheet/openSocialTraderPreview';

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/TraderPreviewSheet/openSocialTraderPreview',
  () => ({ openSocialTraderPreviewIfNotJoined: jest.fn(() => false) }),
);

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance',
  () => ({ ensureSocialTermsAccepted: jest.fn(() => true) }),
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
      invalidateQueries: jest.fn(),
      query: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/navigation/navigateToSocialV1Profile',
  () => ({ navigateToSocialV1Profile: jest.fn() }),
);

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock(
  '../../../../../components/Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({
    getFollowTradingHomeRoute: () => 'SocialV0View',
    isSocialV1Treatment: jest.fn(() => false),
    popToSocialTab: jest.fn(),
  }),
);

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

describe('handleSocialTraderPositionUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
  const mockInvalidateQueries = ReactQueryService.queryClient
    .invalidateQueries as jest.Mock;
  const mockIsSocialV1Treatment = jest.mocked(isSocialV1Treatment);
  const mockQuery = ReactQueryService.queryClient.query as jest.Mock;
  const mockNavigateToSocialV1Profile = jest.mocked(navigateToSocialV1Profile);

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockBuild.mockReturnValue({ event: 'mocked' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockIsSocialV1Treatment.mockReturnValue(false);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(true);
    jest.mocked(openSocialTraderPreviewIfNotJoined).mockReturnValue(false);
  });

  it('opens the trader preview for a shared link when the user has not joined Social', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);
    jest.mocked(openSocialTraderPreviewIfNotJoined).mockReturnValue(true);

    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(openSocialTraderPreviewIfNotJoined).toHaveBeenCalledWith(
      NavigationService.navigation,
      { kind: 'position', traderId: 'trader-1', positionId: 'position-1' },
    );
    expect(ensureSocialTermsAccepted).not.toHaveBeenCalled();
    expect(mockNavigateToSocialV1Profile).not.toHaveBeenCalled();
  });

  it('keeps the terms gate for a notification instead of the trader preview', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(false);

    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_buy',
    });

    expect(openSocialTraderPreviewIfNotJoined).not.toHaveBeenCalled();
    expect(ensureSocialTermsAccepted).toHaveBeenCalledWith(
      mockNavigate,
      expect.any(Function),
    );
  });

  it('tracks the notification click but does not open the position when the Social terms are not accepted', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(false);

    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_buy',
    });

    expect(ensureSocialTermsAccepted).toHaveBeenCalledWith(
      mockNavigate,
      expect.any(Function),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockBuild).toHaveBeenCalled();
  });

  it('opens the position once the Social terms are accepted', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValueOnce(false);

    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_buy',
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    const onAccepted = jest.mocked(ensureSocialTermsAccepted).mock
      .calls[0]?.[1];
    expect(onAccepted).toEqual(expect.any(Function));
    onAccepted?.();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION,
      expect.objectContaining({
        positionId: 'position-1',
        traderId: 'trader-1',
        source: 'notification',
        isSocialV1: true,
      }),
    );
    expect(mockBuild).toHaveBeenCalledTimes(1);
  });

  it('falls back to Social home when the position fails to open after Accept', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValueOnce(false);
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_buy',
    });
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigator not ready');
    });
    const onAccepted = jest.mocked(ensureSocialTermsAccepted).mock
      .calls[0]?.[1];

    expect(() => onAccepted?.()).not.toThrow();
    expect(popToSocialTab).toHaveBeenCalledWith(NavigationService.navigation);
  });

  it('does not open the fallback when the Social terms are not accepted', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(false);

    handleSocialTraderPositionUrl({ actionPath: '?traderId=trader-1' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to TraderPositionView with positionId and forwards notificationSubtype', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=92d9001b-8b64-4b13-9c1b-ba9292a6099a&traderId=trader-1&deduplication_id=dedup-1&notification_subtype=follow_newtrade_buy',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION, {
      positionId: '92d9001b-8b64-4b13-9c1b-ba9292a6099a',
      traderId: 'trader-1',
      source: 'notification',
      originalEntryPoint: 'notification',
      notificationSubtype: 'follow_newtrade_buy',
      notificationTemplateVariant: undefined,
      isSocialV1: false,
    });
  });

  it('navigates with only positionId and traderId when no subtype is present', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION, {
      positionId: 'position-1',
      traderId: 'trader-1',
      source: 'deep_link',
      originalEntryPoint: 'deep_link',
      notificationSubtype: undefined,
      notificationTemplateVariant: undefined,
      isSocialV1: false,
    });
  });

  it('marks a notification position as Social V1 when the flag is treatment', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);

    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_buy',
    });

    expect(mockNavigateToSocialV1Profile).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION,
      expect.objectContaining({ isSocialV1: true }),
    );
  });

  describe('shared position link on Social V1', () => {
    const position = { positionId: 'position-1', tokenSymbol: 'PEPE' };
    const profileResponse = {
      profile: {
        profileId: 'trader-1',
        address: '0xabc',
        name: 'alice',
        imageUrl: 'https://example.com/alice.png',
      },
      stats: { winRate30d: 0.5, pnl30d: 120, tradeCount30d: 4 },
      followerCount: 9,
    };

    const mockQueries = ({
      positionResult = position,
      positionError,
    }: {
      positionResult?: unknown;
      positionError?: Error;
    } = {}) => {
      mockQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
        if (queryKey[0] === 'SocialService:fetchPositionById') {
          return positionError
            ? Promise.reject(positionError)
            : Promise.resolve(positionResult);
        }
        return Promise.resolve(profileResponse);
      });
    };

    beforeEach(() => {
      mockIsSocialV1Treatment.mockReturnValue(true);
    });

    it('opens the trader profile, then the position sheet with a share button', async () => {
      mockQueries();

      handleSocialTraderPositionUrl({
        actionPath: '?positionId=position-1&traderId=trader-1',
      });

      expect(mockNavigateToSocialV1Profile).toHaveBeenCalledWith(
        NavigationService.navigation,
        { traderId: 'trader-1', source: 'deep_link' },
      );
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.SOCIAL.POSITION_SHEET,
          {
            positionId: 'position-1',
            position,
            author: expect.objectContaining({
              id: 'trader-1',
              username: 'alice',
              address: '0xabc',
            }),
            shareSource: 'deep_link',
          },
        ),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.SOCIAL.POSITION,
        expect.anything(),
      );
      expect(
        mockNavigateToSocialV1Profile.mock.invocationCallOrder[0],
      ).toBeLessThan(mockNavigate.mock.invocationCallOrder[0]);
    });

    it('opens the trader profile once the Social terms are accepted', () => {
      mockQueries();
      jest.mocked(ensureSocialTermsAccepted).mockReturnValueOnce(false);
      handleSocialTraderPositionUrl({
        actionPath: '?positionId=position-1&traderId=trader-1',
      });
      const onAccepted = jest.mocked(ensureSocialTermsAccepted).mock
        .calls[0]?.[1];

      onAccepted?.();

      expect(mockNavigateToSocialV1Profile).toHaveBeenCalledWith(
        NavigationService.navigation,
        { traderId: 'trader-1', source: 'deep_link' },
      );
    });

    it('stays on the profile when the position cannot be fetched', async () => {
      mockQueries({ positionError: new Error('not found') });

      handleSocialTraderPositionUrl({
        actionPath: '?positionId=position-1&traderId=trader-1',
      });

      await waitFor(() =>
        expect(DevLogger.log).toHaveBeenCalledWith(
          '[socialPositionSheetDeeplink] Failed to fetch the position:',
          expect.any(Error),
        ),
      );
      expect(mockNavigateToSocialV1Profile).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('opens the sheet with a fallback author when the profile lookup fails', async () => {
      mockQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) =>
        queryKey[0] === 'SocialService:fetchPositionById'
          ? Promise.resolve(position)
          : Promise.reject(new Error('profile failure')),
      );

      handleSocialTraderPositionUrl({
        actionPath: '?positionId=position-1&traderId=trader-1',
      });

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.SOCIAL.POSITION_SHEET,
          expect.objectContaining({
            author: { id: 'trader-1', username: '', winRatePercent: null },
          }),
        ),
      );
    });

    describe('position ownership', () => {
      const ownerProfileResponse = {
        profile: {
          profileId: 'owner-1',
          address: '0xowner',
          name: 'bob',
          imageUrl: 'https://example.com/bob.png',
        },
        stats: { winRate30d: 0.7, pnl30d: 300, tradeCount30d: 8 },
        followerCount: 3,
      };

      const mockOwnedPosition = (ownerProfileId: string) => {
        const ownedPosition = { ...position, profileId: ownerProfileId };
        mockQuery.mockImplementation(
          ({ queryKey }: { queryKey: unknown[] }) => {
            if (queryKey[0] === 'SocialService:fetchPositionById') {
              return Promise.resolve(ownedPosition);
            }
            const { addressOrId } = queryKey[1] as { addressOrId: string };
            return Promise.resolve(
              addressOrId === 'owner-1'
                ? ownerProfileResponse
                : profileResponse,
            );
          },
        );
        return ownedPosition;
      };

      it('fetches the trader profile in parallel with the position', () => {
        mockQueries();

        handleSocialTraderPositionUrl({
          actionPath: '?positionId=position-1&traderId=trader-1',
        });

        expect(mockQuery).toHaveBeenCalledWith({
          queryKey: [
            'SocialService:fetchPositionById',
            { positionId: 'position-1' },
          ],
        });
        expect(mockQuery).toHaveBeenCalledWith({
          queryKey: [
            'SocialService:fetchTraderProfile',
            { addressOrId: 'trader-1' },
          ],
        });
      });

      it('shows the position under the link trader when its resolved profile owns it', async () => {
        const ownedPosition = mockOwnedPosition('trader-1');

        handleSocialTraderPositionUrl({
          actionPath: '?positionId=position-1&traderId=0xabc',
        });

        await waitFor(() =>
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.SOCIAL.POSITION_SHEET,
            expect.objectContaining({
              position: ownedPosition,
              author: expect.objectContaining({ id: 'trader-1' }),
            }),
          ),
        );
        expect(mockNavigateToSocialV1Profile).toHaveBeenCalledTimes(1);
      });

      it('opens the real owner profile and attributes the position to them on a mismatch', async () => {
        const ownedPosition = mockOwnedPosition('owner-1');

        handleSocialTraderPositionUrl({
          actionPath: '?positionId=position-1&traderId=trader-1',
        });

        await waitFor(() =>
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.SOCIAL.POSITION_SHEET,
            {
              positionId: 'position-1',
              position: ownedPosition,
              author: expect.objectContaining({
                id: 'owner-1',
                username: 'bob',
                address: '0xowner',
              }),
              shareSource: 'deep_link',
            },
          ),
        );
        expect(mockNavigateToSocialV1Profile).toHaveBeenLastCalledWith(
          NavigationService.navigation,
          {
            traderId: 'owner-1',
            traderName: 'bob',
            traderAddress: '0xowner',
            traderAvatarUri: 'https://example.com/bob.png',
            source: 'deep_link',
          },
        );
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.SOCIAL.POSITION_SHEET,
          expect.objectContaining({
            author: expect.objectContaining({ id: 'trader-1' }),
          }),
        );
      });
    });
  });

  it('decodes encoded positionId, traderId, and subtype values', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position%20id%2Fwith%20reserved%3Fchars&traderId=trader%20id%2Fwith%20reserved%3Fchars&deduplication_id=dedup%20id%2Fwith%20reserved%3Fchars&notification_subtype=follow%20newtrade%2Fbuy',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION, {
      positionId: 'position id/with reserved?chars',
      traderId: 'trader id/with reserved?chars',
      source: 'notification',
      originalEntryPoint: 'notification',
      notificationSubtype: 'follow newtrade/buy',
      notificationTemplateVariant: undefined,
      isSocialV1: false,
    });
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleSocialTraderPositionUrl] Parsed navigation parameters:',
      {
        positionId: 'position id/with reserved?chars',
        traderId: 'trader id/with reserved?chars',
        deduplicationId: 'dedup id/with reserved?chars',
        notificationSubtype: 'follow newtrade/buy',
        notificationTemplateVariant: undefined,
      },
    );
  });

  it.each([
    'follow_newtrade_buy',
    'follow_newtrade_sell',
    'follow_newtrade_perp_long',
    'follow_newtrade_perp_short',
  ])('forwards subtype %s through to the destination screen', (subtype) => {
    handleSocialTraderPositionUrl({
      actionPath: `?positionId=position-1&traderId=trader-1&notification_subtype=${subtype}`,
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION,
      expect.objectContaining({ notificationSubtype: subtype }),
    );
  });

  it('falls back to social leaderboard when traderId is missing', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=92d9001b-8b64-4b13-9c1b-ba9292a6099a',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
  });

  it('falls back to social leaderboard when positionId is missing', () => {
    handleSocialTraderPositionUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleSocialTraderPositionUrl] Missing positionId or traderId, falling back to social leaderboard',
    );
  });

  it('falls back to social leaderboard when positionId is blank', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=%20%20&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
  });

  it('invalidates open and closed position queries before navigating', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    expect(mockInvalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: [
        'SocialService:fetchOpenPositions',
        { addressOrId: 'trader-1' },
      ],
    });
    expect(mockInvalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: [
        'SocialService:fetchClosedPositions',
        { addressOrId: 'trader-1' },
      ],
    });

    const firstInvalidationOrder =
      mockInvalidateQueries.mock.invocationCallOrder[0];
    const navigationOrder = mockNavigate.mock.invocationCallOrder[0];
    expect(firstInvalidationOrder).toBeLessThan(navigationOrder);
  });

  it('does not invalidate queries when traderId is missing', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1',
    });

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
  });

  it('does not invalidate queries when positionId is missing', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?traderId=trader-1',
    });

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
  });

  it('still navigates when invalidation rejects', async () => {
    mockInvalidateQueries.mockRejectedValueOnce(new Error('cache failure'));

    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION, {
      positionId: 'position-1',
      traderId: 'trader-1',
      source: 'deep_link',
      originalEntryPoint: 'deep_link',
      notificationSubtype: undefined,
      notificationTemplateVariant: undefined,
      isSocialV1: false,
    });

    await Promise.resolve();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleSocialTraderPositionUrl] Failed to invalidate position queries:',
      expect.any(Error),
    );
  });

  it('extracts notification_template_variant from the URL and forwards it through navigation', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_perp_long&notification_template_variant=urgency',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION,
      expect.objectContaining({ notificationTemplateVariant: 'urgency' }),
    );
  });

  it('includes notification_template_variant on the analytics event when present', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_perp_long&notification_template_variant=question',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'follow_newtrade_perp_long',
      notification_template_variant: 'question',
    });
  });

  it('includes deduplication_id on the notification click when the push URL has one', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&deduplication_id=dedup-1&notification_subtype=follow_newtrade_buy',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'follow_newtrade_buy',
      deduplication_id: 'dedup-1',
    });
  });

  it('omits notification_template_variant from the analytics event when the param is absent', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_buy',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'follow_newtrade_buy',
    });
    expect(mockAddProperties.mock.calls[0]?.[0]).not.toHaveProperty(
      'deduplication_id',
    );
  });

  it('falls back to social leaderboard on navigation errors', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=92d9001b-8b64-4b13-9c1b-ba9292a6099a&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.SOCIAL.V0, undefined, {
      pop: true,
    });
  });

  it('falls back to social leaderboard on the Social tab for the Social V1 treatment', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);

    handleSocialTraderPositionUrl({ actionPath: '' });

    expect(popToSocialTab).toHaveBeenCalledWith(NavigationService.navigation);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not fall back to the Social tab when the Social V1 terms are not accepted', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(false);

    handleSocialTraderPositionUrl({ actionPath: '' });

    expect(popToSocialTab).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
