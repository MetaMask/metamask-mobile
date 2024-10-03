import MetaMetricsPrivacySegmentPlugin from './MetaMetricsPrivacySegmentPlugin';
import METAMETRICS_ANONYMOUS_ID from './MetaMetrics.constants';

import {
  PluginType,
  IdentifyEventType,
  TrackEventType,
  UserTraits,
  EventType,
  SegmentClient,
} from '@segment/analytics-react-native';

class MockSegmentClient {
  userInfo = {
    set: jest.fn(),
    get: jest.fn(),
    onChange: jest.fn(),
  };
}

const mockAnalytics = new MockSegmentClient() as unknown as SegmentClient;

describe('MetaMetricsPrivacySegmentPlugin', () => {
  it('is an enrichment plugin', () => {
    const plugin = new MetaMetricsPrivacySegmentPlugin();
    expect(plugin.type).toBe(PluginType.enrichment);
  });

  it('sets our custom anonymousId for all events', async () => {
    const trackEvent: TrackEventType = {
      event: 'event_name',
      type: EventType.TrackEvent,
    };
    const identifyEvent: IdentifyEventType = {
      type: EventType.IdentifyEvent,
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin();
    plugin.configure(mockAnalytics);

    await plugin.execute(trackEvent);
    await plugin.execute(identifyEvent);

    expect(mockAnalytics.userInfo.set).toHaveBeenCalledTimes(2);
    expect(mockAnalytics.userInfo.set).toHaveBeenCalledWith({
      anonymousId: METAMETRICS_ANONYMOUS_ID,
    });
  });

  it('uses anonymousId as userId for anonymous track events', async () => {
    const event: TrackEventType = {
      event: 'Anonymous Event',
      type: EventType.TrackEvent,
      properties: { anonymous: true },
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin();
    plugin.configure(mockAnalytics);

    const result = await plugin.execute(event);

    expect(result.userId).toBe(METAMETRICS_ANONYMOUS_ID);
    expect((result as TrackEventType).properties?.anonymous).toBeUndefined();
  });

  it('does not replace userId for non-anonymous track events', async () => {
    const expectedUserId = '6D796265-7374-4953-6D65-74616D61736B';

    const event: TrackEventType = {
      event: 'Non-anonymous Event',
      type: EventType.TrackEvent,
      userId: expectedUserId,
      properties: { anonymous: false },
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin();
    plugin.configure(mockAnalytics);

    const result = await plugin.execute(event);

    expect(result.userId).toBe(expectedUserId);
    expect((result as TrackEventType).properties?.anonymous).toBeUndefined();
  });

  it('does not replace userId for non-track events', async () => {
    const expectedUserId = '6D796265-7374-4953-6D65-74616D61736B';

    const identifyEvent: IdentifyEventType = {
      type: EventType.IdentifyEvent,
      traits: {} as UserTraits,
      userId: expectedUserId,
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin();
    plugin.configure(mockAnalytics);

    const result = await plugin.execute(identifyEvent);

    expect(result.userId).toBe(expectedUserId);
  });
});
