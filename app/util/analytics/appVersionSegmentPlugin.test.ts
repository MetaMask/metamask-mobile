import AppVersionSegmentPlugin from './appVersionSegmentPlugin';
import getAnalyticsAppVersion from '../metrics/getAnalyticsAppVersion';
import {
  PluginType,
  EventType,
  TrackEventType,
  IdentifyEventType,
  SegmentClient,
} from '@segment/analytics-react-native';

jest.mock('../metrics/getAnalyticsAppVersion', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetAnalyticsAppVersion =
  getAnalyticsAppVersion as jest.MockedFunction<typeof getAnalyticsAppVersion>;

class MockSegmentClient {
  userInfo = {
    set: jest.fn(),
    get: jest.fn(),
    onChange: jest.fn(),
  };
}

const mockAnalytics = new MockSegmentClient() as unknown as SegmentClient;

describe('AppVersionSegmentPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAnalyticsAppVersion.mockReturnValue('8.6.0-release-candidate');
  });

  it('is an enrichment plugin', () => {
    const plugin = new AppVersionSegmentPlugin();

    expect(plugin.type).toBe(PluginType.enrichment);
  });

  it('sets context.app.version on track events', async () => {
    const trackEvent: TrackEventType = {
      event: 'event_name',
      type: EventType.TrackEvent,
      context: {
        app: {
          name: 'MetaMask',
          version: '8.6.0',
        },
        locale: 'en-US',
      },
    };
    const plugin = new AppVersionSegmentPlugin();
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(trackEvent);

    expect(processedEvent.context).toStrictEqual({
      app: {
        name: 'MetaMask',
        version: '8.6.0-release-candidate',
      },
      locale: 'en-US',
    });
    expect(mockGetAnalyticsAppVersion).toHaveBeenCalledTimes(1);
  });

  it('sets context.app.version on identify events', async () => {
    const identifyEvent: IdentifyEventType = {
      type: EventType.IdentifyEvent,
      context: {
        app: {
          version: '8.6.0',
        },
      },
    };
    const plugin = new AppVersionSegmentPlugin();
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(identifyEvent);

    expect(processedEvent.context?.app?.version).toBe(
      '8.6.0-release-candidate',
    );
  });

  it('creates context.app when context is missing', async () => {
    const trackEvent: TrackEventType = {
      event: 'event_name',
      type: EventType.TrackEvent,
    };
    const plugin = new AppVersionSegmentPlugin();
    plugin.configure(mockAnalytics);

    const processedEvent = await plugin.execute(trackEvent);

    expect(processedEvent.context).toStrictEqual({
      app: {
        version: '8.6.0-release-candidate',
      },
    });
  });
});
