import type { AnalyticsTrackingEvent } from './AnalyticsEventBuilder';
import type {
  AnalyticsEventProperties,
  AnalyticsUserTraits,
} from '@metamask/analytics-controller';

// Create a shared mock manager that will be used by the factory
let mockQueueManagerFromFactory: {
  queueOperation: jest.Mock;
  setMessenger: jest.Mock;
  reset: jest.Mock;
  getQueueLength: jest.Mock;
  isProcessing: jest.Mock;
  waitForQueue: jest.Mock;
};

jest.mock('./queue', () => {
  // Define the mock manager inside the factory to ensure it's in scope
  const mockManager = {
    queueOperation: jest.fn(),
    setMessenger: jest.fn(),
    reset: jest.fn(),
    getQueueLength: jest.fn(),
    isProcessing: jest.fn(),
    waitForQueue: jest.fn(),
  };

  // Store reference globally so tests can access it
  (global as { __mockQueueManager?: typeof mockManager }).__mockQueueManager =
    mockManager;

  return {
    createAnalyticsQueueManager: jest.fn(() => mockManager),
  };
});

jest.mock('./analyticsId', () => ({
  getAnalyticsId: jest.fn(),
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../../selectors/analyticsController', () => ({
  selectAnalyticsEnabled: jest.fn(),
  selectAnalyticsOptedIn: jest.fn(),
}));

jest.mock('../../core/Engine/Engine', () => ({
  default: {
    controllerMessenger: {},
  },
}));

jest.mock('../../core/Analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn(),
}));

jest.mock('../Logger');

import { analytics } from './analytics';
import { getAnalyticsId as getAnalyticsIdFromStorage } from './analyticsId';
import { store } from '../../store';
import {
  selectAnalyticsEnabled,
  selectAnalyticsOptedIn,
} from '../../selectors/analyticsController';
import Logger from '../Logger';

const mockedGetAnalyticsIdFromStorage =
  getAnalyticsIdFromStorage as jest.MockedFunction<
    typeof getAnalyticsIdFromStorage
  >;
const mockedStore = store as jest.Mocked<typeof store>;
const mockedSelectAnalyticsEnabled =
  selectAnalyticsEnabled as jest.MockedFunction<typeof selectAnalyticsEnabled>;
const mockedSelectAnalyticsOptedIn =
  selectAnalyticsOptedIn as jest.MockedFunction<typeof selectAnalyticsOptedIn>;
const mockedLoggerLog = jest.spyOn(Logger, 'log');

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mock manager from the global reference set by the factory
    const globalMockManager = (
      global as { __mockQueueManager?: typeof mockQueueManagerFromFactory }
    ).__mockQueueManager;
    if (globalMockManager) {
      mockQueueManagerFromFactory = globalMockManager;
    }
    mockQueueManagerFromFactory.queueOperation.mockResolvedValue(undefined);
    mockedGetAnalyticsIdFromStorage.mockResolvedValue('test-analytics-id');
    mockedStore.getState.mockReturnValue(
      {} as ReturnType<typeof mockedStore.getState>,
    );
    mockedSelectAnalyticsEnabled.mockReturnValue(true);
    mockedSelectAnalyticsOptedIn.mockReturnValue(true);
  });

  describe('trackEvent', () => {
    it('queues trackEvent operation', () => {
      const event: AnalyticsTrackingEvent = {
        name: 'test_event',
        properties: { prop1: 'value1' },
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return true;
        },
      };

      analytics.trackEvent(event);

      expect(mockQueueManagerFromFactory.queueOperation).toHaveBeenCalledWith(
        'trackEvent',
        event,
      );
    });

    it('logs error when queueOperation rejects', async () => {
      const error = new Error('Queue operation failed');
      mockQueueManagerFromFactory.queueOperation.mockRejectedValue(error);
      const event: AnalyticsTrackingEvent = {
        name: 'test_event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return false;
        },
      };

      analytics.trackEvent(event);

      await new Promise(process.nextTick);

      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Unhandled error in trackEvent',
        error,
      );
    });
  });

  describe('trackView', () => {
    it('queues trackView operation with name and properties', () => {
      const name = 'test_screen';
      const properties: AnalyticsEventProperties = { screen: 'test' };

      analytics.trackView(name, properties);

      expect(mockQueueManagerFromFactory.queueOperation).toHaveBeenCalledWith(
        'trackView',
        name,
        properties,
      );
    });

    it('queues trackView operation with name only', () => {
      const name = 'test_screen';

      analytics.trackView(name);

      expect(mockQueueManagerFromFactory.queueOperation).toHaveBeenCalledWith(
        'trackView',
        name,
        undefined,
      );
    });

    it('logs error when queueOperation rejects', async () => {
      const error = new Error('Queue operation failed');
      mockQueueManagerFromFactory.queueOperation.mockRejectedValue(error);

      analytics.trackView('test_screen');

      await new Promise(process.nextTick);

      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Unhandled error in trackView',
        error,
      );
    });
  });

  describe('identify', () => {
    it('queues identify operation with traits', () => {
      const traits: AnalyticsUserTraits = { userId: 'user123' };

      analytics.identify(traits);

      expect(mockQueueManagerFromFactory.queueOperation).toHaveBeenCalledWith(
        'identify',
        traits,
      );
    });

    it('queues identify operation without traits', () => {
      analytics.identify();

      expect(mockQueueManagerFromFactory.queueOperation).toHaveBeenCalledWith(
        'identify',
        undefined,
      );
    });

    it('logs error when queueOperation rejects', async () => {
      const error = new Error('Queue operation failed');
      mockQueueManagerFromFactory.queueOperation.mockRejectedValue(error);

      analytics.identify();

      await new Promise(process.nextTick);

      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Unhandled error in identify',
        error,
      );
    });
  });

  describe('optIn', () => {
    it('queues optIn operation', () => {
      analytics.optIn();

      expect(mockQueueManagerFromFactory.queueOperation).toHaveBeenCalledWith(
        'optIn',
      );
    });

    it('logs error when queueOperation rejects', async () => {
      const error = new Error('Queue operation failed');
      mockQueueManagerFromFactory.queueOperation.mockRejectedValue(error);

      analytics.optIn();

      await new Promise(process.nextTick);

      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Unhandled error in optIn',
        error,
      );
    });
  });

  describe('optOut', () => {
    it('queues optOut operation', () => {
      analytics.optOut();

      expect(mockQueueManagerFromFactory.queueOperation).toHaveBeenCalledWith(
        'optOut',
      );
    });

    it('logs error when queueOperation rejects', async () => {
      const error = new Error('Queue operation failed');
      mockQueueManagerFromFactory.queueOperation.mockRejectedValue(error);

      analytics.optOut();

      await new Promise(process.nextTick);

      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Unhandled error in optOut',
        error,
      );
    });
  });

  describe('getAnalyticsId', () => {
    it('returns analytics ID from storage', async () => {
      const expectedId = 'test-analytics-id-123';
      mockedGetAnalyticsIdFromStorage.mockResolvedValue(expectedId);

      const result = await analytics.getAnalyticsId();

      expect(result).toBe(expectedId);
      expect(mockedGetAnalyticsIdFromStorage).toHaveBeenCalled();
    });

    it('returns different analytics ID when storage returns different value', async () => {
      const expectedId = 'different-id-456';
      mockedGetAnalyticsIdFromStorage.mockResolvedValue(expectedId);

      const result = await analytics.getAnalyticsId();

      expect(result).toBe(expectedId);
    });
  });

  describe('isEnabled', () => {
    it('returns true when analytics is enabled', () => {
      mockedSelectAnalyticsEnabled.mockReturnValue(true);

      const result = analytics.isEnabled();

      expect(result).toBe(true);
      expect(mockedSelectAnalyticsEnabled).toHaveBeenCalledWith({});
    });

    it('returns false when analytics is disabled', () => {
      mockedSelectAnalyticsEnabled.mockReturnValue(false);

      const result = analytics.isEnabled();

      expect(result).toBe(false);
    });

    it('returns false when selector returns undefined', () => {
      mockedSelectAnalyticsEnabled.mockImplementation(
        (() => undefined) as unknown as () => boolean,
      );

      const result = analytics.isEnabled();

      expect(result).toBe(false);
    });

    it('returns false and logs error when selector throws', () => {
      const error = new Error('Selector failed');
      mockedSelectAnalyticsEnabled.mockImplementation(() => {
        throw error;
      });

      const result = analytics.isEnabled();

      expect(result).toBe(false);
      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Failed to check if analytics is enabled - returning false',
        error,
      );
    });

    it('returns false and logs error when getState throws', () => {
      const error = new Error('getState failed');
      mockedStore.getState.mockImplementation(() => {
        throw error;
      });

      const result = analytics.isEnabled();

      expect(result).toBe(false);
      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Failed to check if analytics is enabled - returning false',
        error,
      );

      // Reset mock implementation to prevent affecting other tests
      mockedStore.getState.mockReset();
      mockedStore.getState.mockReturnValue(
        {} as ReturnType<typeof mockedStore.getState>,
      );
    });
  });

  describe('isOptedIn', () => {
    it('returns true when user opted in', async () => {
      mockedSelectAnalyticsOptedIn.mockReturnValue(true);

      const result = await analytics.isOptedIn();

      expect(result).toBe(true);
      expect(mockedSelectAnalyticsOptedIn).toHaveBeenCalledWith({});
    });

    it('returns false when user opted out', async () => {
      mockedSelectAnalyticsOptedIn.mockReturnValue(false);

      const result = await analytics.isOptedIn();

      expect(result).toBe(false);
    });

    it('returns false when selector returns undefined', async () => {
      mockedSelectAnalyticsOptedIn.mockImplementation(
        (() => undefined) as unknown as () => boolean,
      );

      const result = await analytics.isOptedIn();

      expect(result).toBe(false);
    });

    it('returns false and logs error when selector throws', async () => {
      const error = new Error('Selector failed');
      mockedSelectAnalyticsOptedIn.mockImplementation(() => {
        throw error;
      });

      const result = await analytics.isOptedIn();

      expect(result).toBe(false);
      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Failed to check if user has opted in - returning false',
        error,
      );
    });

    it('returns false and logs error when getState throws', async () => {
      const error = new Error('getState failed');
      mockedStore.getState.mockImplementation(() => {
        throw error;
      });

      const result = await analytics.isOptedIn();

      expect(result).toBe(false);
      expect(mockedLoggerLog).toHaveBeenCalledWith(
        'Analytics: Failed to check if user has opted in - returning false',
        error,
      );

      // Reset mock implementation to prevent affecting other tests
      mockedStore.getState.mockReset();
      mockedStore.getState.mockReturnValue(
        {} as ReturnType<typeof mockedStore.getState>,
      );
    });
  });
});
