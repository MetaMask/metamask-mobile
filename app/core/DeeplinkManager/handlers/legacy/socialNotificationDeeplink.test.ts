import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import {
  parseSocialNotificationDeeplinkParams,
  trackSocialNotificationClick,
} from './socialNotificationDeeplink';

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockBuild = jest.fn().mockReturnValue({ event: 'mocked' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
jest.mock('../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: (...args: unknown[]) => mockAddProperties(...args),
      build: (...args: unknown[]) => mockBuild(...args),
    }),
  },
}));

describe('trackSocialNotificationClick', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockReturnValue({ event: 'mocked' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
  });

  it('includes deduplication_id when the push carries one', () => {
    trackSocialNotificationClick({
      notificationSubtype: 'follow_newtrade_buy',
      deduplicationId: 'dedup-1',
    });

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_NOTIFICATION_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'follow_newtrade_buy',
      deduplication_id: 'dedup-1',
    });
    expect(analytics.trackEvent).toHaveBeenCalledWith({ event: 'mocked' });
  });

  it('includes deduplication_id together with the template variant', () => {
    trackSocialNotificationClick({
      notificationSubtype: 'follow_newtrade_perp_long',
      notificationTemplateVariant: 'question',
      deduplicationId: 'dedup-2',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'follow_newtrade_perp_long',
      deduplication_id: 'dedup-2',
      notification_template_variant: 'question',
    });
  });

  it('omits deduplication_id and the template variant when they are unset', () => {
    trackSocialNotificationClick({
      notificationSubtype: 'follow_newtrade_buy',
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      notification_subtype: 'follow_newtrade_buy',
    });
    expect(mockAddProperties.mock.calls[0]?.[0]).not.toHaveProperty(
      'deduplication_id',
    );
    expect(mockAddProperties.mock.calls[0]?.[0]).not.toHaveProperty(
      'notification_template_variant',
    );
  });

  it('does not track a link that did not come from a notification', () => {
    trackSocialNotificationClick({
      deduplicationId: 'dedup-1',
    });

    expect(mockAddProperties).not.toHaveBeenCalled();
    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });
});

describe('parseSocialNotificationDeeplinkParams', () => {
  it('parses deduplication_id and omits a blank value', () => {
    expect(
      parseSocialNotificationDeeplinkParams(
        '?deduplication_id=dedup-1&notification_subtype=follow_newtrade_buy',
      ).deduplicationId,
    ).toBe('dedup-1');
    expect(
      parseSocialNotificationDeeplinkParams('?deduplication_id=%20%20')
        .deduplicationId,
    ).toBeUndefined();
  });
});
