import { AppState } from 'react-native';
import TrendingFeedSessionManager, {
  TrendingInteractionType,
  TokenClickProperties,
  SearchProperties,
  FilterChangeProperties,
} from './TrendingFeedSessionManager';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

// Mock dependencies
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-session-id'),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({
      trackEvent: mockTrackEvent,
      updateDataRecordingFlag: jest.fn(),
    })),
  },
  MetaMetricsEvents: {
    TRENDING_FEED_VIEWED: 'TRENDING_FEED_VIEWED',
  },
}));

const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'TRENDING_FEED_VIEWED' }),
};

jest.mock('../../../../core/Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => mockEventBuilder),
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

describe('TrendingFeedSessionManager', () => {
  let sessionManager: TrendingFeedSessionManager;
  let mockAddEventListener: jest.Mock;
  let mockRemove: jest.Mock;
  let appStateChangeHandler: ((state: string) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mocks
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
    sessionManager = TrendingFeedSessionManager.getInstance();
    sessionManager.destroy(); // Clean slate for each test
  });

  afterEach(() => {
    sessionManager.destroy();
    jest.useRealTimers();
    appStateChangeHandler = null;
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = TrendingFeedSessionManager.getInstance();
      const instance2 = TrendingFeedSessionManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('startSession', () => {
    it('starts a new session with correct initial state', () => {
      const entryPoint = 'homepage_balance';

      sessionManager.startSession(entryPoint);

      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        session_id: 'mock-session-id',
        interaction_type: TrendingInteractionType.SessionStart,
        session_time: 0,
        is_session_end: false,
        entry_point: entryPoint,
      });
      expect(mockTrackEvent).toHaveBeenCalled();

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Session started',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          entryPoint,
        }),
      );
    });

    it('ignores startSession if session already active', () => {
      sessionManager.startSession('homepage_balance');
      mockTrackEvent.mockClear();

      // Try to start again
      sessionManager.startSession('main_trade_button');

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Session already active',
        expect.any(Object),
      );
    });

    it('resets and starts new session if previous session ended', () => {
      // Start and end first session
      sessionManager.startSession('homepage_balance');
      sessionManager.endSession();
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      // Start new session
      sessionManager.startSession('main_trade_button');

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        session_id: 'mock-session-id',
        interaction_type: TrendingInteractionType.SessionStart,
        session_time: 0,
        is_session_end: false,
        entry_point: 'main_trade_button',
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('endSession', () => {
    it('ends session and sends final event', () => {
      sessionManager.startSession('homepage_balance');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);

      sessionManager.endSession();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        session_id: 'mock-session-id',
        interaction_type: TrendingInteractionType.SessionEnd,
        session_time: 5,
        is_session_end: true,
        entry_point: 'homepage_balance',
      });

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Ending session',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          finalTime: 5,
        }),
      );
    });

    it('ignores endSession if no active session', () => {
      sessionManager.endSession();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('ignores endSession if already ended', () => {
      sessionManager.startSession('homepage_balance');
      sessionManager.endSession();
      mockTrackEvent.mockClear();

      // Try to end again
      sessionManager.endSession();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('AppState Listener Management', () => {
    it('sets up AppState listener when enabled', () => {
      sessionManager.enableAppStateListener();

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: AppState listener enabled',
      );
    });

    it('removes AppState listener when disabled', () => {
      sessionManager.enableAppStateListener();
      sessionManager.disableAppStateListener();

      expect(mockRemove).toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: AppState listener disabled',
      );
    });

    it('does not setup listener twice', () => {
      sessionManager.enableAppStateListener();
      sessionManager.enableAppStateListener();

      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('AppState Change Handling', () => {
    beforeEach(() => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('homepage_balance');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();
    });

    it('ends session when app goes to background', () => {
      jest.advanceTimersByTime(3000); // 3 seconds

      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.SessionEnd,
          session_time: 3,
          is_session_end: true,
        }),
      );
    });

    it('ends session when app becomes inactive', () => {
      jest.advanceTimersByTime(2000); // 2 seconds

      if (appStateChangeHandler) {
        appStateChangeHandler('inactive');
      }

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.SessionEnd,
          session_time: 2,
          is_session_end: true,
        }),
      );
    });

    it('starts new session when app returns from background', () => {
      // End session by backgrounding
      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      // Return to active
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'mock-session-id',
          interaction_type: TrendingInteractionType.SessionStart,
          entry_point: 'background',
          is_session_end: false,
        }),
      );

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: App returned from background, starting new session',
      );
    });

    it('resumes timer if app becomes active without being ended', () => {
      jest.advanceTimersByTime(2000);

      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Session resumed',
        expect.objectContaining({
          sessionId: 'mock-session-id',
        }),
      );
    });
  });

  describe('Time Tracking', () => {
    it('tracks elapsed time correctly', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      // Advance 10 seconds
      jest.advanceTimersByTime(10000);

      sessionManager.endSession();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          session_time: 10,
        }),
      );
    });

    it('rounds time to nearest second', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      // Advance 2.7 seconds
      jest.advanceTimersByTime(2700);

      sessionManager.endSession();

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          session_time: 3, // Rounded up from 2.7
        }),
      );
    });
  });

  describe('destroy', () => {
    it('removes listener and resets state', () => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('trending_feed');

      sessionManager.destroy();

      expect(mockRemove).toHaveBeenCalled();

      // After destroy, endSession will not track (no active session)
      mockTrackEvent.mockClear();
      sessionManager.endSession();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('Session Lifecycle Integration', () => {
    it('handles complete session lifecycle', () => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('homepage_trending');

      // Initial event
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'mock-session-id',
          interaction_type: TrendingInteractionType.SessionStart,
          session_time: 0,
          entry_point: 'homepage_trending',
          is_session_end: false,
        }),
      );

      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      // User active for 5 seconds then backgrounds app
      jest.advanceTimersByTime(5000);

      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }

      // Final event sent
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'mock-session-id',
          interaction_type: TrendingInteractionType.SessionEnd,
          session_time: 5,
          is_session_end: true,
        }),
      );
    });
  });

  describe('isFromTrending', () => {
    it('returns true when session is active', () => {
      sessionManager.startSession('trending_feed');

      const result = sessionManager.isFromTrending;

      expect(result).toBe(true);
    });

    it('returns false when no session has started', () => {
      const result = sessionManager.isFromTrending;

      expect(result).toBe(false);
    });

    it('returns false after session ends', () => {
      sessionManager.startSession('trending_feed');
      sessionManager.endSession();

      const result = sessionManager.isFromTrending;

      expect(result).toBe(false);
    });

    it('returns true when session is resumed after app foregrounds', () => {
      sessionManager.enableAppStateListener();
      sessionManager.startSession('trending_feed');

      // App goes to background - session ends
      if (appStateChangeHandler) {
        appStateChangeHandler('background');
      }
      expect(sessionManager.isFromTrending).toBe(false);

      // App returns to foreground - new session starts
      if (appStateChangeHandler) {
        appStateChangeHandler('active');
      }
      expect(sessionManager.isFromTrending).toBe(true);
    });
  });

  describe('trackTokenClick', () => {
    const mockTokenClickProperties: TokenClickProperties = {
      token_symbol: 'ETH',
      token_address: '0x0000000000000000000000000000000000000000',
      token_name: 'Ethereum',
      chain_id: '0x1',
      position: 0,
      price_usd: 2500.5,
      price_change_pct: 5.25,
      time_filter: '24h',
      sort_option: 'price_change',
      network_filter: 'all',
      is_search_result: false,
    };

    it('tracks token click event with correct properties when session is active', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      sessionManager.trackTokenClick(mockTokenClickProperties);

      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        session_id: 'mock-session-id',
        interaction_type: TrendingInteractionType.TokenClick,
        ...mockTokenClickProperties,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('does not track token click when no session is active', () => {
      mockTrackEvent.mockClear();

      sessionManager.trackTokenClick(mockTokenClickProperties);

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Cannot track token_click - no active session',
      );
    });

    it('tracks token click with search result flag', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      const searchResultProperties: TokenClickProperties = {
        ...mockTokenClickProperties,
        is_search_result: true,
      };

      sessionManager.trackTokenClick(searchResultProperties);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.TokenClick,
          is_search_result: true,
        }),
      );
    });

    it('tracks token click with different positions', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      const positionProperties: TokenClickProperties = {
        ...mockTokenClickProperties,
        position: 5,
      };

      sessionManager.trackTokenClick(positionProperties);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.TokenClick,
          position: 5,
        }),
      );
    });

    it('logs token click details to DevLogger', () => {
      sessionManager.startSession('trending_feed');
      (DevLogger.log as jest.Mock).mockClear();

      sessionManager.trackTokenClick(mockTokenClickProperties);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Token click tracked',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          token_symbol: 'ETH',
          position: 0,
        }),
      );
    });
  });

  describe('trackSearch', () => {
    const mockSearchProperties: SearchProperties = {
      search_query: 'ethereum',
      results_count: 5,
      has_results: true,
      time_filter: '24h',
      sort_option: 'price_change',
      network_filter: 'all',
    };

    it('tracks search event with correct properties when session is active', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      sessionManager.trackSearch(mockSearchProperties);

      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        session_id: 'mock-session-id',
        interaction_type: TrendingInteractionType.Search,
        ...mockSearchProperties,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('does not track search when no session is active', () => {
      mockTrackEvent.mockClear();

      sessionManager.trackSearch(mockSearchProperties);

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Cannot track search - no active session',
      );
    });

    it('tracks search with zero results', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      const noResultsProperties: SearchProperties = {
        ...mockSearchProperties,
        results_count: 0,
        has_results: false,
      };

      sessionManager.trackSearch(noResultsProperties);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.Search,
          results_count: 0,
          has_results: false,
        }),
      );
    });

    it('logs search details to DevLogger', () => {
      sessionManager.startSession('trending_feed');
      (DevLogger.log as jest.Mock).mockClear();

      sessionManager.trackSearch(mockSearchProperties);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Search tracked',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          search_query: 'ethereum',
          results_count: 5,
        }),
      );
    });
  });

  describe('trackFilterChange', () => {
    const mockFilterChangeProperties: FilterChangeProperties = {
      filter_type: 'time',
      previous_value: '24h',
      new_value: '6h',
      time_filter: '6h',
      sort_option: 'price_change',
      network_filter: 'all',
    };

    it('tracks filter change event with correct properties when session is active', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      sessionManager.trackFilterChange(mockFilterChangeProperties);

      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        session_id: 'mock-session-id',
        interaction_type: TrendingInteractionType.FilterChange,
        ...mockFilterChangeProperties,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('does not track filter change when no session is active', () => {
      mockTrackEvent.mockClear();

      sessionManager.trackFilterChange(mockFilterChangeProperties);

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Cannot track filter_change - no active session',
      );
    });

    it('tracks time filter changes', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      sessionManager.trackFilterChange(mockFilterChangeProperties);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.FilterChange,
          filter_type: 'time',
          previous_value: '24h',
          new_value: '6h',
        }),
      );
    });

    it('tracks sort filter changes', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      const sortFilterChange: FilterChangeProperties = {
        filter_type: 'sort',
        previous_value: 'price_change',
        new_value: 'volume',
        time_filter: '24h',
        sort_option: 'volume',
        network_filter: 'all',
      };

      sessionManager.trackFilterChange(sortFilterChange);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.FilterChange,
          filter_type: 'sort',
          previous_value: 'price_change',
          new_value: 'volume',
        }),
      );
    });

    it('tracks network filter changes', () => {
      sessionManager.startSession('trending_feed');
      mockTrackEvent.mockClear();
      (mockEventBuilder.addProperties as jest.Mock).mockClear();

      const networkFilterChange: FilterChangeProperties = {
        filter_type: 'network',
        previous_value: 'all',
        new_value: 'eip155:1',
        time_filter: '24h',
        sort_option: 'price_change',
        network_filter: 'eip155:1',
      };

      sessionManager.trackFilterChange(networkFilterChange);

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: TrendingInteractionType.FilterChange,
          filter_type: 'network',
          previous_value: 'all',
          new_value: 'eip155:1',
        }),
      );
    });

    it('logs filter change details to DevLogger', () => {
      sessionManager.startSession('trending_feed');
      (DevLogger.log as jest.Mock).mockClear();

      sessionManager.trackFilterChange(mockFilterChangeProperties);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TrendingFeedSessionManager: Filter change tracked',
        expect.objectContaining({
          sessionId: 'mock-session-id',
          filter_type: 'time',
          previous_value: '24h',
          new_value: '6h',
        }),
      );
    });
  });
});
