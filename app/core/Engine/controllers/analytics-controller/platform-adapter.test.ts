import { createPlatformAdapter } from './platform-adapter';
import type { SegmentClient } from '@segment/analytics-react-native';
import MetaMetricsPrivacySegmentPlugin from '../../../Analytics/MetaMetricsPrivacySegmentPlugin';

// Mock Logger (not in global setup)
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock MetaMetricsPrivacySegmentPlugin (not in global setup)
jest.mock('../../../Analytics/MetaMetricsPrivacySegmentPlugin', () =>
  jest.fn().mockImplementation(() => ({
    type: 'enrichment',
  })),
);

const mockMetaMetricsPrivacySegmentPlugin =
  MetaMetricsPrivacySegmentPlugin as jest.MockedClass<
    typeof MetaMetricsPrivacySegmentPlugin
  >;

// Mock segmentPersistor (needed for getSegmentClient, but createClient is already mocked in testSetup.js)
jest.mock('../../../Analytics/SegmentPersistor', () => ({
  segmentPersistor: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Segment client is already mocked in testSetup.js via @segment/analytics-react-native
interface GlobalWithSegmentClient {
  segmentMockClient: SegmentClient;
}

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

  describe('adapter instance', () => {
    it('is not a singleton', () => {
      const adapter1 = createPlatformAdapter();
      const adapter2 = createPlatformAdapter();

      expect(adapter1).not.toBe(adapter2);
    });
  });
});
