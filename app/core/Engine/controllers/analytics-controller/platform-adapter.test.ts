import { createPlatformAdapter } from './platform-adapter';
import type { SegmentClient } from '@segment/analytics-react-native';
import MetaMetricsPrivacySegmentPlugin from '../../../Analytics/MetaMetricsPrivacySegmentPlugin';
import StorageWrapper from '../../../../store/storage-wrapper';

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

// Mock StorageWrapper for onSetupCompleted
jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(),
    multiGet: jest.fn(),
    onKeyChange: jest.fn(),
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

    it('adds MetaMetricsPrivacySegmentPlugin to Segment client with analyticsId and reads opt-in value from MMKV', async () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const analyticsId = '6ba7b810-9dad-42d1-80b4-00c04fd430c8';

      StorageWrapper.getItem = jest.fn().mockResolvedValueOnce('true'); // optedIn

      await adapter.onSetupCompleted(analyticsId);

      expect(mockMetaMetricsPrivacySegmentPlugin).toHaveBeenCalledWith(
        analyticsId,
      );
      expect(segmentMockClient.add).toHaveBeenCalledWith({
        plugin: expect.any(Object),
      });
      expect(StorageWrapper.getItem).toHaveBeenCalledTimes(1);
    });

    it('handles missing opt-in value gracefully', async () => {
      const adapter = createPlatformAdapter();
      const { segmentMockClient } =
        global as unknown as GlobalWithSegmentClient;
      const analyticsId = '6ba7b810-9dad-42d1-80b4-00c04fd430c8';

      StorageWrapper.getItem = jest.fn().mockResolvedValueOnce(null); // optedIn

      await adapter.onSetupCompleted(analyticsId);

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
