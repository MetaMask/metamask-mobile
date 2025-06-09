import MetaMetricsPrivacySegmentPlugin from './MetaMetricsPrivacySegmentPlugin';
import METAMETRICS_ANONYMOUS_ID from './MetaMetrics.constants';

import {
  PluginType,
  IdentifyEventType,
  TrackEventType,
  UserTraits,
  EventType,
  SegmentClient, GroupEventType,
} from '@segment/analytics-react-native';
import {AliasEventType} from '@segment/analytics-react-native/src/types';

class MockSegmentClient {
  userInfo = {
    set: jest.fn(),
    get: jest.fn(),
    onChange: jest.fn(),
  };
}

const mockAnalytics = new MockSegmentClient() as unknown as SegmentClient;

const mockUserId = '6D796265-7374-4953-6D65-74616D61736B';

describe('MetaMetricsPrivacySegmentPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is an enrichment plugin', () => {
    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    expect(plugin.type).toBe(PluginType.enrichment);
  });

  it('sets custom anonymousId for track events', async () => {
    const trackEvent: TrackEventType = {
      event: 'event_name',
      type: EventType.TrackEvent,
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(trackEvent);

    expect(processedEvent).toStrictEqual({...trackEvent, userId: mockUserId, anonymousId: METAMETRICS_ANONYMOUS_ID});

    expect(mockAnalytics.userInfo.set).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.userInfo.set).toHaveBeenCalledWith({
      anonymousId: METAMETRICS_ANONYMOUS_ID,
    });
  });

  it('does not set custom anonymousId for non track events', async () => {
    const identifyEvent: IdentifyEventType = {
      type: EventType.IdentifyEvent,
    };
    const aliasEvent: AliasEventType = {
      previousId: 'previous_id',
      type: EventType.AliasEvent
    };
    const groupEvent: GroupEventType = {
      groupId: 'group_id',
      type: EventType.GroupEvent
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    plugin.configure(mockAnalytics);

    const processedIdentEvent = await plugin.execute(identifyEvent);
    const processedAliasEvent = await plugin.execute(aliasEvent);
    const processedGroupEvent = await plugin.execute(groupEvent);

    expect(processedIdentEvent).toStrictEqual(identifyEvent);
    expect(processedAliasEvent).toStrictEqual(aliasEvent);
    expect(processedGroupEvent).toStrictEqual(groupEvent);

    expect(mockAnalytics.userInfo.set).not.toHaveBeenCalled();
  });

  it('uses anonymousId as userId for anonymous track events', async () => {
    const event: TrackEventType = {
      event: 'Anonymous Event',
      type: EventType.TrackEvent,
      properties: { anonymous: true },
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(event);

    expect(processedEvent.userId).toBe(METAMETRICS_ANONYMOUS_ID);
    expect((processedEvent as TrackEventType).properties?.anonymous).toBeUndefined();
  });

  it('uses anonymousId as userId if provided user id is invalid', async () => {
    const event: TrackEventType = {
      event: 'Test Event',
      type: EventType.TrackEvent
    };

    const emptyUserId = '';

    const plugin = new MetaMetricsPrivacySegmentPlugin(emptyUserId);
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(event);

    expect(processedEvent.userId).toBe(METAMETRICS_ANONYMOUS_ID);
  });

  it('replaces anonymousId if not custom null id', async () => {
    const event: TrackEventType = {
      event: 'Test Event',
      type: EventType.TrackEvent,
      anonymousId: 'not-our-custom-id'
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(event);

    expect(processedEvent.anonymousId).toBe(METAMETRICS_ANONYMOUS_ID);
    expect(mockAnalytics.userInfo.set).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.userInfo.set).toHaveBeenCalledWith({
      anonymousId: METAMETRICS_ANONYMOUS_ID,
    });
  });

  it('does not replaces anonymousId if already custom null id', async () => {
    const event: TrackEventType = {
      event: 'Test Event',
      type: EventType.TrackEvent,
      anonymousId: METAMETRICS_ANONYMOUS_ID
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(event);

    expect(processedEvent.anonymousId).toBe(METAMETRICS_ANONYMOUS_ID);
    expect(mockAnalytics.userInfo.set).not.toHaveBeenCalled();
  });

  it('does not replace userId for non-anonymous track events', async () => {
    // This is a different UUIDv4 than the mockUserId
    const expectedUserId = '74686973-5555-4944-4973-344B796C616E';

    const event: TrackEventType = {
      event: 'Non-anonymous Event',
      type: EventType.TrackEvent,
      userId: expectedUserId,
      properties: { anonymous: false },
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    plugin.configure(mockAnalytics);

    const result = await plugin.execute(event);

    expect(result.userId).toBe(expectedUserId);
    expect((result as TrackEventType).properties?.anonymous).toBeUndefined();
  });

  it('does not replace userId for non-track events', async () => {
    // This is a different UUIDv4 than the mockUserId
    const expectedUserId = '74686973-5555-4944-4973-344B796C616E';

    const identifyEvent: IdentifyEventType = {
      type: EventType.IdentifyEvent,
      traits: {} as UserTraits,
      userId: expectedUserId,
    };

    const plugin = new MetaMetricsPrivacySegmentPlugin(mockUserId);
    plugin.configure(mockAnalytics);

    const result = await plugin.execute(identifyEvent);

    expect(result.userId).toBe(expectedUserId);
  });
});
