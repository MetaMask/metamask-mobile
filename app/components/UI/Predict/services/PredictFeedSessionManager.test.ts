import { AppState } from 'react-native';
import PredictFeedSessionManager from './PredictFeedSessionManager';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { PredictEventValues } from '../constants/eventNames';

// Mock dependencies
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-session-id'),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackFeedViewed: jest.fn(),
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

describe('PredictFeedSessionManager', () => {
  let sessionManager: PredictFeedSessionManager;
  let mockTrackFeedViewed: jest.Mock;
  let mockAddEventListener: jest.Mock;
  let mockRemove: jest.Mock;
  let appStateChangeHandler: ((state: string) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mocks
    mockTrackFeedViewed = Engine.context.PredictController
      .trackFeedViewed as jest.Mock;

    mockRemove = jest.fn();
    mockAddEventListener = AppState.addEventListener as jest.Mock;
    mockAddEventListener.mockReturnValue({ remove: mockRemove });

    // Capture AppState change handler
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        appStateChangeHandler = handler;
      }
      return { remove: mockRemove };
    });

    // Get fresh instance
    sessionManager = PredictFeedSessionManager.getInstance();
    sessionManager.destroy(); // Clean slate for each test
  });

  afterEach(() => {
    sessionManager.destroy();
    jest.useRealTimers();
    appStateChangeHandler = null;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PredictFeedSessionManager.getInstance();
      const instance2 = PredictFeedSessionManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('startSession', () => {
    it('should start a new session with correct initial state', () => {
      const entryPoint = 'homepage_balance';
      const initialTab = 'crypto';

      sessionManager.startSession(entryPoint, initialTab);

      expect(mockTrackFeedViewed).toHaveBeenCalledWith({
        sessionId: 'mock-session-id',
        feedTab: initialTab,
        numPagesViewed: 0,
        sessionTime: 0,
        entryPoint,
        isSessionEnd: false,
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: Session started',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          entryPoint,
          initialTab,
        }),
      );
    });

    it('should use default tab if not provided', () => {
      sessionManager.startSession('main_trade_button');

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          feedTab: 'trending',
        }),
      );
    });

    it('should ignore startSession if session already active', () => {
      sessionManager.startSession('homepage_balance');
      mockTrackFeedViewed.mockClear();

      // Try to start again
      sessionManager.startSession('main_trade_button');

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: Session already active',
        expect.any(Object),
      );
    });

    it('should reset and start new session if previous session ended', () => {
      // Start and end first session
      sessionManager.startSession('homepage_balance');
      sessionManager.endSession();
      mockTrackFeedViewed.mockClear();

      // Start new session
      sessionManager.startSession('main_trade_button');

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'mock-session-id',
          entryPoint: 'main_trade_button',
          isSessionEnd: false,
        }),
      );
    });
  });

  describe('endSession', () => {
    it('should end session and send final event', () => {
      sessionManager.startSession('homepage_balance');
      mockTrackFeedViewed.mockClear();

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);

      sessionManager.endSession();

      expect(mockTrackFeedViewed).toHaveBeenCalledWith({
        sessionId: 'mock-session-id',
        feedTab: 'trending',
        numPagesViewed: 0,
        sessionTime: 5,
        entryPoint: 'homepage_balance',
        isSessionEnd: true,
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: Ending session',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          finalTime: 5,
        }),
      );
    });

    it('should ignore endSession if no active session', () => {
      sessionManager.endSession();

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });

    it('should ignore endSession if already ended', () => {
      sessionManager.startSession('homepage_balance');
      sessionManager.endSession();
      mockTrackFeedViewed.mockClear();

      // Try to end again
      sessionManager.endSession();

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });
  });

  describe('trackTabChange', () => {
    it('should track tab change and increment page count', () => {
      sessionManager.startSession('predict_feed');
      mockTrackFeedViewed.mockClear();

      sessionManager.trackTabChange('crypto');

      expect(mockTrackFeedViewed).toHaveBeenCalledWith({
        sessionId: 'mock-session-id',
        feedTab: 'crypto',
        numPagesViewed: 1,
        sessionTime: 0,
        entryPoint: 'predict_feed',
        isSessionEnd: false,
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: Tab changed',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          newTab: 'crypto',
          pageViewCount: 1,
        }),
      );
    });

    it('should ignore if no active session', () => {
      sessionManager.trackTabChange('crypto');

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });

    it('should ignore if session ended', () => {
      sessionManager.startSession('predict_feed');
      sessionManager.endSession();
      mockTrackFeedViewed.mockClear();

      sessionManager.trackTabChange('crypto');

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });

    it('should accumulate page views across multiple tab changes', () => {
      sessionManager.startSession('predict_feed');
      mockTrackFeedViewed.mockClear();

      sessionManager.trackTabChange('crypto');
      sessionManager.trackTabChange('sports');
      sessionManager.trackTabChange('politics');

      // Check last call
      expect(mockTrackFeedViewed).toHaveBeenLastCalledWith(
        expect.objectContaining({
          feedTab: 'politics',
          numPagesViewed: 3,
        }),
      );
    });
  });

  describe('trackPageView', () => {
    it('should track page view and increment count', () => {
      sessionManager.startSession('predict_feed');
      mockTrackFeedViewed.mockClear();

      sessionManager.trackPageView();

      expect(mockTrackFeedViewed).toHaveBeenCalledWith({
        sessionId: 'mock-session-id',
        feedTab: 'trending',
        numPagesViewed: 1,
        sessionTime: 0,
        entryPoint: 'predict_feed',
        isSessionEnd: false,
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: Page viewed',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          pageViewCount: 1,
        }),
      );
    });

    it('should ignore if no active session', () => {
      sessionManager.trackPageView();

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });

    it('should ignore if session ended', () => {
      sessionManager.startSession('predict_feed');
      sessionManager.endSession();
      mockTrackFeedViewed.mockClear();

      sessionManager.trackPageView();

      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });

    it('should count both page views and tab changes', () => {
      sessionManager.startSession('predict_feed');
      mockTrackFeedViewed.mockClear();

      sessionManager.trackPageView(); // count: 1
      sessionManager.trackTabChange('crypto'); // count: 2
      sessionManager.trackPageView(); // count: 3

      expect(mockTrackFeedViewed).toHaveBeenLastCalledWith(
        expect.objectContaining({
          numPagesViewed: 3,
        }),
      );
    });
  });

  describe('AppState Listener Management', () => {
    it('should setup AppState listener when enabled', () => {
      sessionManager.enableAppStateListener();

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: AppState listener enabled',
      );
    });

    it('should remove AppState listener when disabled', () => {
      sessionManager.enableAppStateListener();
      sessionManager.disableAppStateListener();

      expect(mockRemove).toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: AppState listener disabled',
      );
    });

    it('should not setup listener twice', () => {
      sessionManager.enableAppStateListener();
      sessionManager.enableAppStateListener();

      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppState Change Handling', () => {
    beforeEach(() => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('homepage_balance');
      mockTrackFeedViewed.mockClear();
    });

    it('should end session when app goes to background', () => {
      jest.advanceTimersByTime(3000); // 3 seconds

      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTime: 3,
          isSessionEnd: true,
        }),
      );
    });

    it('should end session when app becomes inactive', () => {
      jest.advanceTimersByTime(2000); // 2 seconds

      if (appStateChangeHandler) {
        appStateChangeHandler('inactive');
      }

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTime: 2,
          isSessionEnd: true,
        }),
      );
    });

    it('should start new session when app returns from background', () => {
      // End session by backgrounding
      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }
      mockTrackFeedViewed.mockClear();

      // Return to active
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'mock-session-id',
          entryPoint: PredictEventValues.ENTRY_POINT.BACKGROUND,
          isSessionEnd: false,
        }),
      );

      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: App returned from background, starting new session',
      );
    });

    it('should just resume timer if app becomes active without being ended', () => {
      // Simulate inactive state without ending session (edge case)
      // This shouldn't normally happen but tests the resume logic

      // Manually trigger inactive then active without going through background
      // (In real scenario, background/inactive would end session)
      // Here we're testing the resume path if somehow session didn't end

      jest.advanceTimersByTime(2000);

      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      // Should log resume
      expect(DevLogger.log).toHaveBeenCalledWith(
        'PredictFeedSessionManager: Session resumed',
        expect.objectContaining({
          sessionId: 'mock-session-id',
        }),
      );
    });
  });

  describe('Time Tracking', () => {
    it('should track elapsed time correctly', () => {
      sessionManager.startSession('predict_feed');
      mockTrackFeedViewed.mockClear();

      // Advance 10 seconds
      jest.advanceTimersByTime(10000);

      sessionManager.trackPageView();

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTime: 10,
        }),
      );
    });

    it('should accumulate time across pause/resume cycles', () => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('predict_feed');
      mockTrackFeedViewed.mockClear();

      // Active for 5 seconds
      jest.advanceTimersByTime(5000);

      // Go background (pause)
      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }

      // Check final time was 5 seconds
      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTime: 5,
          isSessionEnd: true,
        }),
      );

      mockTrackFeedViewed.mockClear();

      // Return to active (starts new session)
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      // New session starts at 0
      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTime: 0,
          isSessionEnd: false,
        }),
      );

      mockTrackFeedViewed.mockClear();

      // Active for another 3 seconds
      jest.advanceTimersByTime(3000);

      sessionManager.trackPageView();

      // New session time should be 3 (not 8)
      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTime: 3,
        }),
      );
    });

    it('should round time to nearest second', () => {
      sessionManager.startSession('predict_feed');
      mockTrackFeedViewed.mockClear();

      // Advance 2.7 seconds
      jest.advanceTimersByTime(2700);

      sessionManager.endSession();

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTime: 3, // Rounded up from 2.7
        }),
      );
    });
  });

  describe('destroy', () => {
    it('should remove listener and reset state', () => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('predict_feed');

      sessionManager.destroy();

      expect(mockRemove).toHaveBeenCalled();

      // After destroy, trackPageView should not track (no active session)
      mockTrackFeedViewed.mockClear();
      sessionManager.trackPageView();
      expect(mockTrackFeedViewed).not.toHaveBeenCalled();
    });
  });

  describe('Session Lifecycle Integration', () => {
    it('should handle complete session lifecycle with all tracking', () => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('homepage_new_prediction', 'trending');

      // Initial event
      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'mock-session-id',
          feedTab: 'trending',
          numPagesViewed: 0,
          sessionTime: 0,
          entryPoint: 'homepage_new_prediction',
          isSessionEnd: false,
        }),
      );

      mockTrackFeedViewed.mockClear();

      // User active for 5 seconds
      jest.advanceTimersByTime(5000);

      // User switches to crypto tab
      sessionManager.trackTabChange('crypto');

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          feedTab: 'crypto',
          numPagesViewed: 1,
          sessionTime: 5,
          isSessionEnd: false,
        }),
      );

      mockTrackFeedViewed.mockClear();

      // User active for 3 more seconds
      jest.advanceTimersByTime(3000);

      // User views market details (tracked as page view)
      sessionManager.trackPageView();

      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          numPagesViewed: 2,
          sessionTime: 8,
          isSessionEnd: false,
        }),
      );

      mockTrackFeedViewed.mockClear();

      // User active for 2 more seconds
      jest.advanceTimersByTime(2000);

      // User backgrounds app
      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }

      // Final event sent
      expect(mockTrackFeedViewed).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'mock-session-id',
          numPagesViewed: 2,
          sessionTime: 10,
          isSessionEnd: true,
        }),
      );
    });
  });
});
