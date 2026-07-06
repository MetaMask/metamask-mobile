/* eslint-disable @typescript-eslint/no-deprecated */
import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import ReactQueryService from '../../../../ReactQueryService';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { handleSocialTraderPositionUrl } from '../handleSocialTraderPositionUrl';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to TraderPositionView with positionId and forwards notificationSubtype', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=92d9001b-8b64-4b13-9c1b-ba9292a6099a&traderId=trader-1&deduplication_id=dedup-1&notification_subtype=follow_newtrade_buy',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        positionId: '92d9001b-8b64-4b13-9c1b-ba9292a6099a',
        traderId: 'trader-1',
        source: 'notification',
        notificationSubtype: 'follow_newtrade_buy',
        notificationTemplateVariant: undefined,
      },
    );
  });

  it('navigates with only positionId and traderId when no subtype is present', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        positionId: 'position-1',
        traderId: 'trader-1',
        source: 'notification',
        notificationSubtype: undefined,
        notificationTemplateVariant: undefined,
      },
    );
  });

  it('decodes encoded positionId, traderId, and subtype values', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position%20id%2Fwith%20reserved%3Fchars&traderId=trader%20id%2Fwith%20reserved%3Fchars&deduplication_id=dedup%20id%2Fwith%20reserved%3Fchars&notification_subtype=follow%20newtrade%2Fbuy',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        positionId: 'position id/with reserved?chars',
        traderId: 'trader id/with reserved?chars',
        source: 'notification',
        notificationSubtype: 'follow newtrade/buy',
        notificationTemplateVariant: undefined,
      },
    );
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
      Routes.SOCIAL_LEADERBOARD.POSITION,
      expect.objectContaining({ notificationSubtype: subtype }),
    );
  });

  it('falls back to social leaderboard when traderId is missing', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=92d9001b-8b64-4b13-9c1b-ba9292a6099a',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
  });

  it('falls back to social leaderboard when positionId is missing', () => {
    handleSocialTraderPositionUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleSocialTraderPositionUrl] Missing positionId or traderId, falling back to social leaderboard',
    );
  });

  it('falls back to social leaderboard when positionId is blank', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?positionId=%20%20&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
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
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
  });

  it('does not invalidate queries when positionId is missing', () => {
    handleSocialTraderPositionUrl({
      actionPath: '?traderId=trader-1',
    });

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW);
  });

  it('still navigates when invalidation throws', () => {
    mockInvalidateQueries.mockImplementationOnce(() => {
      throw new Error('cache failure');
    });

    handleSocialTraderPositionUrl({
      actionPath: '?positionId=position-1&traderId=trader-1',
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        positionId: 'position-1',
        traderId: 'trader-1',
        source: 'notification',
        notificationSubtype: undefined,
        notificationTemplateVariant: undefined,
      },
    );
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
      Routes.SOCIAL_LEADERBOARD.POSITION,
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

  it('omits notification_template_variant from the analytics event when the param is absent', () => {
    handleSocialTraderPositionUrl({
      actionPath:
        '?positionId=position-1&traderId=trader-1&notification_subtype=follow_newtrade_buy',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'follow_newtrade_buy',
    });
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
    expect(mockNavigate).toHaveBeenLastCalledWith(
      Routes.SOCIAL_LEADERBOARD.VIEW,
    );
  });
});
