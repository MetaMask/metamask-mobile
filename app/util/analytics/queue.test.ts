import {
  createAnalyticsQueueManager,
  type QueueManager,
  type QueueManagerDependencies,
} from './queue';
import type { RootExtendedMessenger } from '../../core/Engine/types';
import type {
  AnalyticsEventProperties,
  AnalyticsUserTraits,
} from '@metamask/analytics-controller';
import type { AnalyticsTrackingEvent } from './AnalyticsEventBuilder';
import Logger from '../Logger';

// Mock Logger
jest.mock('../Logger');

const mockLoggerError = jest.spyOn(Logger, 'error');

describe('createAnalyticsQueueManager', () => {
  let mockMessenger: {
    call: jest.Mock;
  };
  let mockGetEngineMessenger: jest.Mock;
  let mockWhenEngineReady: jest.Mock;
  let dependencies: QueueManagerDependencies;
  let queueManager: QueueManager;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMessenger = {
      call: jest.fn(),
    };

    mockGetEngineMessenger = jest.fn(() => mockMessenger);
    mockWhenEngineReady = jest.fn().mockResolvedValue(undefined);

    dependencies = {
      getEngineMessenger: mockGetEngineMessenger,
      whenEngineReady: mockWhenEngineReady,
    };

    queueManager = createAnalyticsQueueManager(dependencies);
  });

  describe('queueOperation', () => {
    it('adds operation to queue when messenger is not ready', async () => {
      mockGetEngineMessenger.mockReturnValue(null);
      let whenEngineReadyResolve: (() => void) | null = null;
      const whenEngineReadyPromise = new Promise<void>((resolve) => {
        whenEngineReadyResolve = resolve;
      });
      mockWhenEngineReady.mockReturnValue(whenEngineReadyPromise);

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

      const queuePromise = queueManager.queueOperation('trackEvent', event);

      // Wait a bit for the queue to be set up
      await new Promise(process.nextTick);

      expect(queueManager.getQueueLength()).toBe(1);
      expect(mockWhenEngineReady).toHaveBeenCalled();

      // Now resolve whenEngineReady and set messenger
      mockGetEngineMessenger.mockReturnValue(mockMessenger);
      if (whenEngineReadyResolve !== null) {
        (whenEngineReadyResolve as () => void)();
      }

      await queuePromise;

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
    });

    it('processes operation immediately when messenger is ready', async () => {
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

      await queueManager.queueOperation('trackEvent', event);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
      expect(queueManager.getQueueLength()).toBe(0);
    });

    it('processes multiple operations in order', async () => {
      mockGetEngineMessenger.mockReturnValue(null);

      const event1: AnalyticsTrackingEvent = {
        name: 'event1',
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

      const event2: AnalyticsTrackingEvent = {
        name: 'event2',
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

      // Queue operations when messenger is not ready
      queueManager.queueOperation('trackEvent', event1);
      queueManager.queueOperation('trackView', 'screen1');
      queueManager.queueOperation('trackEvent', event2);

      expect(queueManager.getQueueLength()).toBe(3);

      // Now set messenger and process
      mockGetEngineMessenger.mockReturnValue(mockMessenger);
      queueManager.setMessenger(
        mockMessenger as unknown as RootExtendedMessenger,
      );

      await queueManager.waitForQueue();

      expect(mockMessenger.call).toHaveBeenCalledTimes(3);
      expect(mockMessenger.call).toHaveBeenNthCalledWith(
        1,
        'AnalyticsController:trackEvent',
        event1,
      );
      expect(mockMessenger.call).toHaveBeenNthCalledWith(
        2,
        'AnalyticsController:trackView',
        'screen1',
        undefined,
      );
      expect(mockMessenger.call).toHaveBeenNthCalledWith(
        3,
        'AnalyticsController:trackEvent',
        event2,
      );
    });

    it('handles trackView with properties', async () => {
      const properties: AnalyticsEventProperties = { screen: 'test' };

      await queueManager.queueOperation('trackView', 'test_screen', properties);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackView',
        'test_screen',
        properties,
      );
    });

    it('handles identify with traits', async () => {
      const traits: AnalyticsUserTraits = { userId: 'user123' };

      await queueManager.queueOperation('identify', traits);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:identify',
        traits,
      );
    });

    it('handles identify without traits', async () => {
      await queueManager.queueOperation('identify', undefined);

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:identify',
        undefined,
      );
    });

    it('handles optIn', async () => {
      await queueManager.queueOperation('optIn');

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optIn',
      );
    });

    it('handles optOut', async () => {
      await queueManager.queueOperation('optOut');

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optOut',
      );
    });

    it('logs error for unknown action', async () => {
      await queueManager.queueOperation('unknownAction', 'arg1', 'arg2');

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        'Analytics: Attempted to execute unknown action',
      );
    });

    it('continues processing queue after error', async () => {
      const error = new Error('First call failed');
      let callCount = 0;
      mockMessenger.call.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw error;
        }
      });

      const event1: AnalyticsTrackingEvent = {
        name: 'event1',
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

      const event2: AnalyticsTrackingEvent = {
        name: 'event2',
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

      // Queue both operations
      queueManager.queueOperation('trackEvent', event1);
      queueManager.queueOperation('trackEvent', event2);

      // Process queue
      await queueManager.waitForQueue();

      expect(mockMessenger.call).toHaveBeenCalledTimes(2);
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        "Analytics: Failed to process queued operation 'trackEvent' - continuing with next operation",
      );
    });

    it('logs error when Engine initialization fails', async () => {
      mockGetEngineMessenger.mockReturnValue(null);
      const error = new Error('Engine init failed');
      mockWhenEngineReady.mockRejectedValue(error);

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

      await queueManager.queueOperation('trackEvent', event);

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(Error),
        'Analytics: Failed to initialize messenger - operations will remain queued',
      );
      expect(queueManager.getQueueLength()).toBe(1);
    });

    it('processes queued operations when messenger becomes ready', async () => {
      mockGetEngineMessenger.mockReturnValue(null);

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

      const queuePromise = queueManager.queueOperation('trackEvent', event);

      expect(queueManager.getQueueLength()).toBe(1);

      // Simulate messenger becoming ready
      mockGetEngineMessenger.mockReturnValue(mockMessenger);
      mockWhenEngineReady.mockResolvedValue(undefined);

      await queuePromise;

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
      expect(queueManager.getQueueLength()).toBe(0);
    });
  });

  describe('setMessenger', () => {
    it('sets messenger and processes queue', async () => {
      mockGetEngineMessenger.mockReturnValue(null);

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

      await queueManager.queueOperation('trackEvent', event);

      expect(queueManager.getQueueLength()).toBe(1);
      expect(mockMessenger.call).not.toHaveBeenCalled();

      queueManager.setMessenger(
        mockMessenger as unknown as RootExtendedMessenger,
      );

      await queueManager.waitForQueue();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
      expect(queueManager.getQueueLength()).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets queue state to initial state', async () => {
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

      await queueManager.queueOperation('trackEvent', event);
      expect(queueManager.getQueueLength()).toBe(0);

      await queueManager.queueOperation('trackEvent', event);
      queueManager.reset();

      expect(queueManager.getQueueLength()).toBe(0);
      expect(queueManager.isProcessing()).toBe(false);
    });
  });

  describe('getQueueLength', () => {
    it('returns 0 for empty queue', () => {
      expect(queueManager.getQueueLength()).toBe(0);
    });

    it('returns correct length when operations are queued', async () => {
      mockGetEngineMessenger.mockReturnValue(null);

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

      queueManager.queueOperation('trackEvent', event);

      expect(queueManager.getQueueLength()).toBe(1);

      queueManager.queueOperation('trackView', 'screen');

      expect(queueManager.getQueueLength()).toBe(2);
    });
  });

  describe('isProcessing', () => {
    it('returns false when not processing', () => {
      expect(queueManager.isProcessing()).toBe(false);
    });

    it('returns false after processing completes', async () => {
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

      const processPromise = queueManager.queueOperation('trackEvent', event);

      // Wait for the processing promise to complete
      await processPromise;

      // Wait for any pending state updates
      // The processing state is set to false inside the async function,
      // so we need to wait for it to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);

      expect(queueManager.isProcessing()).toBe(false);
    });
  });

  describe('waitForQueue', () => {
    it('resolves immediately when queue is not processing', async () => {
      await expect(queueManager.waitForQueue()).resolves.toBeUndefined();
    });

    it('waits for queue processing to complete', async () => {
      let waitStarted = false;
      let waitCompleted = false;

      mockMessenger.call.mockImplementation(async () => {
        waitStarted = true;
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

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

      const processPromise = queueManager.queueOperation('trackEvent', event);

      const waitPromise = queueManager.waitForQueue().then(() => {
        waitCompleted = true;
      });

      await processPromise;
      await waitPromise;

      expect(waitStarted).toBe(true);
      expect(waitCompleted).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('handles concurrent queue operations', async () => {
      const events: AnalyticsTrackingEvent[] = Array.from(
        { length: 5 },
        (_, i) => ({
          name: `event${i}`,
          properties: {},
          sensitiveProperties: {},
          saveDataRecording: false,
          get isAnonymous(): boolean {
            return false;
          },
          get hasProperties(): boolean {
            return false;
          },
        }),
      );

      await Promise.all(
        events.map((event) => queueManager.queueOperation('trackEvent', event)),
      );

      expect(mockMessenger.call).toHaveBeenCalledTimes(5);
      expect(queueManager.getQueueLength()).toBe(0);
    });

    it('preserves operations added during processing (race condition fix)', async () => {
      const event1: AnalyticsTrackingEvent = {
        name: 'event1',
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

      const event2: AnalyticsTrackingEvent = {
        name: 'event2',
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

      const event3: AnalyticsTrackingEvent = {
        name: 'event3',
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

      // Queue first operation
      const processPromise1 = queueManager.queueOperation('trackEvent', event1);

      // Add second operation while first is being processed (race condition scenario)
      // The promise execution is deferred, so this will be added after capture but before clear
      queueManager.queueOperation('trackEvent', event2);

      // Wait for first batch to complete
      await processPromise1;

      // Add third operation after processing has started but before it completes
      queueManager.queueOperation('trackEvent', event3);

      // Wait for all processing to complete
      await queueManager.waitForQueue();

      // All three events should be processed
      expect(mockMessenger.call).toHaveBeenCalledTimes(3);
      expect(mockMessenger.call).toHaveBeenNthCalledWith(
        1,
        'AnalyticsController:trackEvent',
        event1,
      );
      expect(mockMessenger.call).toHaveBeenNthCalledWith(
        2,
        'AnalyticsController:trackEvent',
        event2,
      );
      expect(mockMessenger.call).toHaveBeenNthCalledWith(
        3,
        'AnalyticsController:trackEvent',
        event3,
      );
      expect(queueManager.getQueueLength()).toBe(0);
    });
  });

  describe('state isolation', () => {
    it('creates independent queue managers', async () => {
      const queueManager1 = createAnalyticsQueueManager(dependencies);
      const queueManager2 = createAnalyticsQueueManager(dependencies);

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

      await queueManager1.queueOperation('trackEvent', event);

      expect(queueManager1.getQueueLength()).toBe(0);
      expect(queueManager2.getQueueLength()).toBe(0);
      expect(mockMessenger.call).toHaveBeenCalledTimes(1);
    });
  });
});
