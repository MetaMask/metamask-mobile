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
    },
  },
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockBuild.mockReturnValue({ event: 'mocked' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockIsSocialV1Treatment.mockReturnValue(false);
    jest.mocked(ensureSocialTermsAccepted).mockReturnValue(true);
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
      actionPath: '?positionId=position-1&traderId=trader-1',
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

  it('marks the position as Social V1 when the flag is treatment', () => {
    mockIsSocialV1Treatment.mockReturnValue(true);

    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION,
      expect.objectContaining({ isSocialV1: true }),
    );
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
