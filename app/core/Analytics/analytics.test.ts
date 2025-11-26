import type { RootExtendedMessenger } from '../Engine/types';
import Engine from '../Engine/Engine';
import { whenEngineReady } from './whenEngineReady';
import Logger from '../../util/Logger';
import ReduxService from '../redux/ReduxService';

let mockEngineContextValue: typeof Engine.context | null = null;
let mockControllerMessengerValue: RootExtendedMessenger | null = null;
let mockReduxState: ReturnType<typeof ReduxService.store.getState> | null =
  null;

jest.mock('../Engine/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockEngineContextValue as typeof Engine.context;
    },
    get controllerMessenger() {
      return mockControllerMessengerValue;
    },
    set controllerMessenger(value: RootExtendedMessenger | null) {
      mockControllerMessengerValue = value;
    },
    get state() {
      return {};
    },
  },
}));

jest.mock('../redux/ReduxService', () => ({
  __esModule: true,
  default: {
    get store() {
      return {
        getState: jest.fn(
          () =>
            mockReduxState || ({ engine: { backgroundState: {} } } as never),
        ),
      };
    },
  },
}));

jest.mock('./whenEngineReady');
jest.mock('../../util/Logger');

const mockSelectAnalyticsId = jest.fn();
const mockSelectAnalyticsEnabled = jest.fn();
const mockSelectAnalyticsOptedInForRegularAccount = jest.fn();
const mockSelectAnalyticsOptedInForSocialAccount = jest.fn();

jest.mock('../../selectors/analyticsController', () => ({
  selectAnalyticsId: mockSelectAnalyticsId,
  selectAnalyticsEnabled: mockSelectAnalyticsEnabled,
  selectAnalyticsOptedInForRegularAccount:
    mockSelectAnalyticsOptedInForRegularAccount,
  selectAnalyticsOptedInForSocialAccount:
    mockSelectAnalyticsOptedInForSocialAccount,
}));

describe('analytics', () => {
  let mockMessenger: RootExtendedMessenger;
  let analytics: typeof import('./analytics').analytics;
  let AnalyticsEventBuilder: typeof import('./analytics').AnalyticsEventBuilder;
  let mockWhenEngineReadyFn: jest.MockedFunction<typeof whenEngineReady>;
  let mockLogger: jest.Mocked<typeof Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset module state by isolating modules
    jest.isolateModules(() => {
      const analyticsModule = jest.requireActual('./analytics');
      analytics = analyticsModule.analytics;
      AnalyticsEventBuilder = analyticsModule.AnalyticsEventBuilder;
    });

    mockMessenger = {
      call: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      subscribeOnce: jest.fn(),
      subscribeOnceIf: jest.fn(),
      tryUnsubscribe: jest.fn(),
    } as unknown as RootExtendedMessenger;

    mockEngineContextValue = {} as typeof Engine.context;
    mockControllerMessengerValue = null;
    mockReduxState = { engine: { backgroundState: {} } } as never;
    mockWhenEngineReadyFn = whenEngineReady as jest.MockedFunction<
      typeof whenEngineReady
    >;
    mockLogger = Logger as jest.Mocked<typeof Logger>;
    mockWhenEngineReadyFn.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('AnalyticsEventBuilder', () => {
    it('builds event with all properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop: 'value' })
        .addSensitiveProperties({ sensitive: 'data' })
        .setSaveDataRecording(true)
        .build();

      expect(event).toEqual({
        name: 'test_event',
        properties: { prop: 'value' },
        sensitiveProperties: { sensitive: 'data' },
        saveDataRecording: true,
        hasProperties: true,
      });
    });

    it('builds event with only name', () => {
      const event =
        AnalyticsEventBuilder.createEventBuilder('test_event').build();

      expect(event).toEqual({
        name: 'test_event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        hasProperties: false,
      });
    });

    it('builds event with properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop: 'value' })
        .build();

      expect(event).toEqual({
        name: 'test_event',
        properties: { prop: 'value' },
        sensitiveProperties: {},
        saveDataRecording: false,
        hasProperties: true,
      });
    });

    it('builds event with sensitive properties only', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ sensitive: 'data' })
        .build();

      expect(event).toEqual({
        name: 'test_event',
        properties: {},
        sensitiveProperties: { sensitive: 'data' },
        saveDataRecording: false,
        hasProperties: true,
      });
    });

    it('removes properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop1: 'value1', prop2: 'value2' })
        .removeProperties(['prop1'])
        .build();

      expect(event.properties).toEqual({ prop2: 'value2' });
    });

    it('removes sensitive properties', () => {
      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addSensitiveProperties({ sensitive1: 'data1', sensitive2: 'data2' })
        .removeSensitiveProperties(['sensitive1'])
        .build();

      expect(event.sensitiveProperties).toEqual({ sensitive2: 'data2' });
    });
  });

  describe('trackEvent', () => {
    it('queues event when messenger is not ready', () => {
      mockControllerMessengerValue = null;

      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop: 'value' })
        .build();
      analytics.trackEvent(event);

      expect(mockMessenger.call).not.toHaveBeenCalled();
      expect(mockWhenEngineReadyFn).toHaveBeenCalled();
    });

    it('tracks event immediately when messenger is ready', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      const event = AnalyticsEventBuilder.createEventBuilder('test_event')
        .addProperties({ prop: 'value' })
        .build();
      analytics.trackEvent(event);

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
    });

    it('tracks event with empty properties', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      const event =
        AnalyticsEventBuilder.createEventBuilder('test_event').build();
      analytics.trackEvent(event);

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
    });
  });

  describe('trackView', () => {
    it('queues view when messenger is not ready', () => {
      mockControllerMessengerValue = null;

      analytics.trackView('test_screen', { prop: 'value' });

      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('tracks view immediately when messenger is ready', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.trackView('test_screen', { prop: 'value' });

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackView',
        'test_screen',
        { prop: 'value' },
      );
    });

    it('tracks view without properties', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.trackView('test_screen');

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackView',
        'test_screen',
        undefined,
      );
    });
  });

  describe('identify', () => {
    it('queues identify when messenger is not ready', () => {
      mockControllerMessengerValue = null;

      analytics.identify({ userId: '123' });

      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('identifies user immediately when messenger is ready', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.identify({ userId: '123' });

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:identify',
        { userId: '123' },
      );
    });

    it('identifies user without traits', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.identify();

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:identify',
        undefined,
      );
    });
  });

  describe('optInForRegularAccount', () => {
    it('queues optInForRegularAccount when messenger is not ready', () => {
      mockControllerMessengerValue = null;

      analytics.optInForRegularAccount();

      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('opts in immediately when messenger is ready', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.optInForRegularAccount();

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optInForRegularAccount',
      );
    });
  });

  describe('optOutForRegularAccount', () => {
    it('queues optOutForRegularAccount when messenger is not ready', () => {
      mockControllerMessengerValue = null;

      analytics.optOutForRegularAccount();

      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('opts out immediately when messenger is ready', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.optOutForRegularAccount();

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optOutForRegularAccount',
      );
    });
  });

  describe('optInForSocialAccount', () => {
    it('queues optInForSocialAccount when messenger is not ready', () => {
      mockControllerMessengerValue = null;

      analytics.optInForSocialAccount();

      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('opts in for social account immediately when messenger is ready', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.optInForSocialAccount();

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optInForSocialAccount',
      );
    });
  });

  describe('optOutForSocialAccount', () => {
    it('queues optOutForSocialAccount when messenger is not ready', () => {
      mockControllerMessengerValue = null;

      analytics.optOutForSocialAccount();

      expect(mockMessenger.call).not.toHaveBeenCalled();
    });

    it('opts out for social account immediately when messenger is ready', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Initialize messenger by calling isEnabled (which sets messenger synchronously)
      analytics.isEnabled();

      // Clear the isEnabled call from the mock
      (mockMessenger.call as jest.Mock).mockClear();

      analytics.optOutForSocialAccount();

      // Wait for queue processing (processQueue is async)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optOutForSocialAccount',
      );
    });
  });

  describe('getAnalyticsId', () => {
    it('returns analytics ID from Redux selector', async () => {
      mockSelectAnalyticsId.mockReturnValue(
        'f2673eb8-db32-40bb-88a5-97cf5107d31d',
      );
      mockReduxState = { engine: { backgroundState: {} } } as never;

      const result = await analytics.getAnalyticsId();

      expect(result).toBe('f2673eb8-db32-40bb-88a5-97cf5107d31d');
      expect(mockSelectAnalyticsId).toHaveBeenCalled();
    });

    it('returns empty string when selector returns undefined', async () => {
      mockSelectAnalyticsId.mockReturnValue(undefined);

      const result = await analytics.getAnalyticsId();

      expect(result).toBe('');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns empty string when selector throws error', async () => {
      mockSelectAnalyticsId.mockImplementation(() => {
        throw new Error('Selector error');
      });

      const result = await analytics.getAnalyticsId();

      expect(result).toBe('');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('returns enabled state from Redux selector', async () => {
      mockSelectAnalyticsEnabled.mockReturnValue(true);
      mockReduxState = { engine: { backgroundState: {} } } as never;

      const result = analytics.isEnabled();

      expect(result).toBe(true);
      expect(mockSelectAnalyticsEnabled).toHaveBeenCalled();
    });

    it('returns false when selector throws error', async () => {
      mockSelectAnalyticsEnabled.mockImplementation(() => {
        throw new Error('Selector error');
      });

      const result = analytics.isEnabled();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('isOptedInForRegularAccount', () => {
    it('returns opted in state from Redux selector', async () => {
      mockSelectAnalyticsOptedInForRegularAccount.mockReturnValue(true);
      mockReduxState = { engine: { backgroundState: {} } } as never;

      const result = await analytics.isOptedInForRegularAccount();

      expect(result).toBe(true);
      expect(mockSelectAnalyticsOptedInForRegularAccount).toHaveBeenCalled();
    });

    it('returns false when selector returns undefined', async () => {
      mockSelectAnalyticsOptedInForRegularAccount.mockReturnValue(undefined);

      const result = await analytics.isOptedInForRegularAccount();

      expect(result).toBe(false);
    });

    it('returns false when selector throws error', async () => {
      mockSelectAnalyticsOptedInForRegularAccount.mockImplementation(() => {
        throw new Error('Selector error');
      });

      const result = await analytics.isOptedInForRegularAccount();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('isOptedInForSocialAccount', () => {
    it('returns social opted in state from Redux selector', async () => {
      mockSelectAnalyticsOptedInForSocialAccount.mockReturnValue(true);
      mockReduxState = { engine: { backgroundState: {} } } as never;

      const result = await analytics.isOptedInForSocialAccount();

      expect(result).toBe(true);
      expect(mockSelectAnalyticsOptedInForSocialAccount).toHaveBeenCalled();
    });

    it('returns false when selector returns undefined', async () => {
      mockSelectAnalyticsOptedInForSocialAccount.mockReturnValue(undefined);

      const result = await analytics.isOptedInForSocialAccount();

      expect(result).toBe(false);
    });

    it('returns false when selector throws error', async () => {
      mockSelectAnalyticsOptedInForSocialAccount.mockImplementation(() => {
        throw new Error('Selector error');
      });

      const result = await analytics.isOptedInForSocialAccount();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('queue processing', () => {
    it('executes queued operations when messenger becomes ready', async () => {
      mockControllerMessengerValue = null;

      const event = AnalyticsEventBuilder.createEventBuilder('queued_event')
        .addProperties({ prop: 'value' })
        .build();
      analytics.trackEvent(event);
      analytics.optInForRegularAccount();

      expect(mockMessenger.call).not.toHaveBeenCalled();

      // Simulate messenger becoming ready
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;

      // Fast-forward to trigger queue processing
      jest.advanceTimersByTime(0);
      await Promise.resolve();

      expect(mockMessenger.call).toHaveBeenCalledTimes(2);
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optInForRegularAccount',
      );
    });

    it('executes remaining queued operations after one operation fails', async () => {
      mockControllerMessengerValue = mockMessenger;
      mockEngineContextValue = {} as typeof Engine.context;
      (mockMessenger.call as jest.Mock).mockImplementation((action) => {
        if (action === 'AnalyticsController:trackEvent') {
          throw new Error('Track failed');
        }
      });

      const event =
        AnalyticsEventBuilder.createEventBuilder('failing_event').build();
      analytics.trackEvent(event);
      analytics.optInForRegularAccount();

      jest.advanceTimersByTime(0);
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:optInForRegularAccount',
      );
    });
  });
});
