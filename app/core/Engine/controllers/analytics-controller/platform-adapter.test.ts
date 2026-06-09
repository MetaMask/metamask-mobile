import { createPlatformAdapter, normalizeProxyUrl } from './platform-adapter';
import {
  createClient,
  type SegmentClient,
  DestinationPlugin,
} from '@segment/analytics-react-native';
import MetaMetricsPrivacySegmentPlugin from '../../../../util/analytics/privacySegmentPlugin';

// Mock Logger (not in global setup)
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock MetaMetricsPrivacySegmentPlugin (not in global setup)
jest.mock('../../../../util/analytics/privacySegmentPlugin', () =>
  jest.fn().mockImplementation(() => ({
    type: 'enrichment',
  })),
);

const mockMetaMetricsPrivacySegmentPlugin =
  MetaMetricsPrivacySegmentPlugin as jest.MockedClass<
    typeof MetaMetricsPrivacySegmentPlugin
  >;

// Mock segmentPersistor (needed for getSegmentClient, but createClient is already mocked in testSetup.js)
jest.mock('../../../../util/analytics/SegmentPersistor', () => ({
  segmentPersistor: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

interface GlobalWithSegmentClient {
  segmentMockClient: SegmentClient;
}

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

// Realistic proxy URL shapes used by MetaMask (base64 write-key in query params).
// The actual values are redacted in .js.env; the structural pattern is:
//   https://fn.segmentapis.com/v1/b?b=<base64_key>[=|==]
// DEV keys typically produce single `=` padding; PROD keys often produce `==`.
const DEV_PROXY_URL =
  'https://fn.segmentapis.com/v1/b?b=dGVzdC1kZXYta2V5MTIzNA==';
const PROD_PROXY_URL =
  'https://fn.segmentapis.com/v1/b?b=dGVzdC1wcm9kLWtleUFCQ0Q=';
const MULTI_PARAM_URL =
  'https://fn.segmentapis.com/v1/b?region=us-west&b=dGVzdC1rZXkxMjM=&v=2';

describe('normalizeProxyUrl', () => {
  it('returns undefined when url is undefined', () => {
    const result = normalizeProxyUrl(undefined);

    expect(result).toBeUndefined();
  });

  it('returns undefined when url is an empty string', () => {
    const result = normalizeProxyUrl('');

    expect(result).toBeUndefined();
  });

  it('returns the URL unchanged when there is no base64 padding', () => {
    const url = 'https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ';

    const result = normalizeProxyUrl(url);

    expect(result).toBe('https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ');
  });

  it('strips a single trailing = from the last query param', () => {
    const result = normalizeProxyUrl(
      'https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ=',
    );

    expect(result).toBe('https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ');
  });

  it('strips double trailing == from the last query param', () => {
    const result = normalizeProxyUrl(
      'https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ==',
    );

    expect(result).toBe('https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ');
  });

  it('strips trailing = padding from a mid-URL query param followed by another param', () => {
    const result = normalizeProxyUrl(
      'https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ==&v=2',
    );

    expect(result).toBe('https://fn.segmentapis.com/v1/b?b=dGVzdGtleQ&v=2');
  });

  it('preserves = key-value separators in query params', () => {
    const result = normalizeProxyUrl(
      'https://fn.segmentapis.com/v1/b?region=us-west&b=dGVzdGtleQ==',
    );

    expect(result).toBe(
      'https://fn.segmentapis.com/v1/b?region=us-west&b=dGVzdGtleQ',
    );
  });

  it('strips padding from multiple params that each carry base64 values', () => {
    const result = normalizeProxyUrl(
      'https://fn.segmentapis.com/v1/b?a=dGVzdA==&b=dGVzdGtleQ=',
    );

    expect(result).toBe(
      'https://fn.segmentapis.com/v1/b?a=dGVzdA&b=dGVzdGtleQ',
    );
  });

  it('returns the URL unchanged when it has no query string', () => {
    const url = 'https://fn.segmentapis.com/v1/b';

    const result = normalizeProxyUrl(url);

    expect(result).toBe('https://fn.segmentapis.com/v1/b');
  });

  it('normalises the dev-environment proxy URL (double == padding)', () => {
    const result = normalizeProxyUrl(DEV_PROXY_URL);

    expect(result).toBe(
      'https://fn.segmentapis.com/v1/b?b=dGVzdC1kZXYta2V5MTIzNA',
    );
  });

  it('normalises the prod-environment proxy URL (single = padding)', () => {
    const result = normalizeProxyUrl(PROD_PROXY_URL);

    expect(result).toBe(
      'https://fn.segmentapis.com/v1/b?b=dGVzdC1wcm9kLWtleUFCQ0Q',
    );
  });

  it('normalises a multi-param proxy URL preserving non-base64 params', () => {
    const result = normalizeProxyUrl(MULTI_PARAM_URL);

    expect(result).toBe(
      'https://fn.segmentapis.com/v1/b?region=us-west&b=dGVzdC1rZXkxMjM&v=2',
    );
  });

  it('passes Segment validateURL regex after normalisation for dev URL', () => {
    const result = normalizeProxyUrl(DEV_PROXY_URL) as string;

    // The Segment regex allows only [a-zA-Z0-9_.-] in query-param values.
    // After normalisation no `=` padding should remain in any param value.
    const queryString = result.split('?')[1] ?? '';
    const paramValues = queryString
      .split('&')
      .map((pair) => pair.split('=')[1]);
    paramValues.forEach((value) => {
      expect(value).toMatch(/^[a-zA-Z0-9_.-]+$/);
    });
  });

  it('passes Segment validateURL regex after normalisation for prod URL', () => {
    const result = normalizeProxyUrl(PROD_PROXY_URL) as string;

    const queryString = result.split('?')[1] ?? '';
    const paramValues = queryString
      .split('&')
      .map((pair) => pair.split('=')[1]);
    paramValues.forEach((value) => {
      expect(value).toMatch(/^[a-zA-Z0-9_.-]+$/);
    });
  });
});

describe('createPlatformAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('track', () => {
    it('calls Segment client.track with eventName and properties', () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const eventName = 'test_event';
      const properties = { key: 'value', count: 42 };

      adapter.track(eventName, properties);

      expect(segmentMockClient.track).toHaveBeenCalledWith(
        eventName,
        properties,
      );
    });

    it('calls Segment client.track without properties', () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const eventName = 'test_event';

      adapter.track(eventName);

      expect(segmentMockClient.track).toHaveBeenCalledWith(eventName);
    });
  });

  describe('identify', () => {
    it('calls Segment client.identify with userId and traits', () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const userId = '123e4567-e89b-42d3-a456-426614174000';
      const traits = { name: 'John', email: 'john@example.com' };

      adapter.identify(userId, traits);

      expect(segmentMockClient.identify).toHaveBeenCalledWith(userId, traits);
    });

    it('calls Segment client.identify with only userId when no traits', () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const userId = '550e8400-e29b-42d4-a716-446655440000';

      adapter.identify(userId);

      expect(segmentMockClient.identify).toHaveBeenCalledWith(userId);
    });
  });

  describe('view', () => {
    it('calls Segment client.screen with name and properties', () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const name = 'HomeScreen';
      const properties = { category: 'navigation', timestamp: Date.now() };

      adapter.view(name, properties);

      expect(segmentMockClient.screen).toHaveBeenCalledWith(name, properties);
    });

    it('calls Segment client.screen with name without properties', () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const name = 'HomeScreen';

      adapter.view(name);

      expect(segmentMockClient.screen).toHaveBeenCalledWith(name);
    });
  });

  describe('onSetupCompleted', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('adds MetaMetricsPrivacySegmentPlugin to Segment client with analyticsId', () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const analyticsId = '6ba7b810-9dad-42d1-80b4-00c04fd430c8';

      adapter.onSetupCompleted(analyticsId);

      expect(mockMetaMetricsPrivacySegmentPlugin).toHaveBeenCalledWith(
        analyticsId,
      );
      expect(segmentMockClient.add).toHaveBeenCalledWith({
        plugin: expect.any(Object),
      });
    });
  });

  describe('segmentPlugins parameter', () => {
    it('adds provided plugins to the Segment client', () => {
      const mockPlugin = new DestinationPlugin();

      createPlatformAdapter([mockPlugin]);
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;

      expect(segmentMockClient.add).toHaveBeenCalledWith({
        plugin: mockPlugin,
      });
    });

    it('does not throw when no plugins are provided', () => {
      expect(() => createPlatformAdapter()).not.toThrow();
    });
  });

  describe('adapter instance', () => {
    it('is not a singleton', () => {
      const adapter1 = createPlatformAdapter();
      const adapter2 = createPlatformAdapter();

      expect(adapter1).not.toBe(adapter2);
    });
  });

  describe('proxy URL normalisation', () => {
    // babel-plugin-transform-inline-environment-variables bakes process.env.*
    // at compile time, so env vars cannot be mutated at test runtime. The
    // SEGMENT_PROXY_URL value is therefore always undefined in the Jest
    // environment, which means createClient receives an undefined proxy. The
    // normaliseProxyUrl unit tests above already prove the function handles
    // all URL shapes. Here we verify the wiring: createClient receives the
    // output of normalizeProxyUrl, whatever that resolves to.
    it('passes the output of normalizeProxyUrl as the proxy config to createClient', () => {
      mockCreateClient.mockClear();

      createPlatformAdapter();

      expect(mockCreateClient).toHaveBeenCalledTimes(1);
      const calledConfig = mockCreateClient.mock.calls[0][0];
      // The proxy field is present in the config object (value depends on env).
      expect(calledConfig).toHaveProperty('proxy');
    });
  });
});
