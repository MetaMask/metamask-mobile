import { analytics } from '../../../util/analytics/analytics';
import logger from './logger';
import {
  trackWalletEvent,
  type WalletConnectionEventName,
  type WalletEventProperties,
} from './v2-analytics';

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(),
  },
}));

jest.mock('./logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;
const mockLogger = logger as jest.Mocked<typeof logger>;

const V2_ANALYTICS_ENDPOINT =
  'https://mm-sdk-analytics.api.cx.metamask.io/v2/events';

const createProperties = (
  overrides: Partial<WalletEventProperties> = {},
): WalletEventProperties => ({
  remote_session_id: 'test-anon-id',
  platform: 'mobile',
  ...overrides,
});

describe('trackWalletEvent', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('does not send event when analytics is disabled', () => {
    mockAnalytics.isEnabled.mockReturnValue(false);
    const properties = createProperties();

    trackWalletEvent('Remote Connection Request Received', properties);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends POST request with correct payload when analytics is enabled', () => {
    mockAnalytics.isEnabled.mockReturnValue(true);
    const eventName: WalletConnectionEventName =
      'Remote Connection Request Received';
    const properties = createProperties({ sdk_version: '1.0.0' });

    trackWalletEvent(eventName, properties);

    expect(fetchSpy).toHaveBeenCalledWith(V2_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          namespace: 'mobile/sdk-connect-v2',
          event_name: eventName,
          properties,
        },
      ]),
    });
  });

  it('sends payload wrapped in a single-element array', () => {
    mockAnalytics.isEnabled.mockReturnValue(true);
    const properties = createProperties();

    trackWalletEvent('Remote Connection Request Failed', properties);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toHaveLength(1);
    expect(body[0].namespace).toBe('mobile/sdk-connect-v2');
  });

  it('includes optional properties in the payload', () => {
    mockAnalytics.isEnabled.mockReturnValue(true);
    const properties = createProperties({
      sdk_version: '2.0.0',
      sdk_platform: 'react-native',
      found_in_store: true,
    });

    trackWalletEvent('Remote Connection Request Failed', properties);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body[0].properties).toStrictEqual(properties);
  });

  it('logs error when fetch rejects', async () => {
    mockAnalytics.isEnabled.mockReturnValue(true);
    const networkError = new Error('Network failure');
    fetchSpy.mockRejectedValue(networkError);
    const eventName: WalletConnectionEventName =
      'Remote Connection Request Received';
    const properties = createProperties();

    trackWalletEvent(eventName, properties);

    await new Promise(process.nextTick);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'v2-analytics: failed to send event',
      eventName,
      networkError,
    );
  });

  it('does not log error when fetch resolves', async () => {
    mockAnalytics.isEnabled.mockReturnValue(true);
    const properties = createProperties();

    trackWalletEvent('Remote Connection Request Received', properties);

    await new Promise(process.nextTick);

    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
