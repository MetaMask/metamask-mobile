import { AppState, AppStateStatus } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { MetaMetrics, MetaMetricsEvents } from '../../../../core/Analytics';
import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';

/**
 * Interaction types for Trending Feed analytics events
 */
export enum TrendingInteractionType {
  SessionStart = 'session_start',
  SessionEnd = 'session_end',
  TokenClick = 'token_click',
  Search = 'search',
  FilterChange = 'filter_change',
}

/**
 * Properties for token click tracking
 */
export interface TokenClickProperties {
  /** Token symbol clicked */
  token_symbol: string;
  /** Token contract address */
  token_address: string;
  /** Token display name */
  token_name: string;
  /** Network chain ID (hex format) */
  chain_id: string;
  /** 0-indexed position in list */
  position: number;
  /** Token price at click time (USD) */
  price_usd: number;
  /** Price change percentage */
  price_change_pct: number;
  /** Active time filter (e.g., '24h', '6h', '1h', '5m') */
  time_filter: string;
  /** Active sort option (e.g., 'price_change', 'volume', 'market_cap') */
  sort_option: string;
  /** Active network filter (e.g., 'all' or specific chain ID) */
  network_filter: string;
  /** Was this from search results? */
  is_search_result: boolean;
}

/**
 * Properties for search tracking
 */
export interface SearchProperties {
  /** The search query entered */
  search_query: string;
  /** Number of results returned */
  results_count: number;
  /** Whether search returned any results */
  has_results: boolean;
  /** Active time filter (e.g., '24h', '6h', '1h', '5m') */
  time_filter: string;
  /** Active sort option (e.g., 'price_change', 'volume', 'market_cap') */
  sort_option: string;
  /** Active network filter (e.g., 'all' or specific chain ID) */
  network_filter: string;
}

/**
 * Filter types for filter change tracking
 */
export type FilterType = 'time' | 'sort' | 'network';

/**
 * Properties for filter change tracking
 */
export interface FilterChangeProperties {
  /** Type of filter that changed */
  filter_type: FilterType;
  /** Previous filter value */
  previous_value: string;
  /** New filter value */
  new_value: string;
  /** Active time filter (e.g., '24h', '6h', '1h', '5m') */
  time_filter: string;
  /** Active sort option (e.g., 'price_change', 'volume', 'market_cap') */
  sort_option: string;
  /** Active network filter (e.g., 'all' or specific chain ID) */
  network_filter: string;
}

/**
 * Singleton manager for Trending Feed session tracking
 * Handles session lifecycle, timing, and analytics events
 *
 * Session boundaries:
 * - Start: User enters Trending Feed
 * - End: App backgrounds OR user navigates away from feed
 *
 * Each session gets unique ID and tracks:
 * - Time spent in feed (with AppState pause/resume)
 * - Entry point (how user entered feed)
 */
class TrendingFeedSessionManager {
  private static instance: TrendingFeedSessionManager | null = null;

  // Session state
  private sessionId: string | null = null;
  private sessionEnded: boolean = false;
  private entryPoint: string | undefined = undefined;

  // Timing (with AppState handling)
  private startTime: number | null = null;
  private accumulatedTime: number = 0;
  private lastActiveTime: number | null = null;

  // AppState subscription (only active when TrendingFeed is mounted)
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private appStateListenerEnabled: boolean = false;

  private constructor() {
    // Don't setup listener in constructor - let TrendingFeed enable it when mounted
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TrendingFeedSessionManager {
    if (!TrendingFeedSessionManager.instance) {
      TrendingFeedSessionManager.instance = new TrendingFeedSessionManager();
    }
    return TrendingFeedSessionManager.instance;
  }

  /**
   * Setup AppState listener to handle app backgrounding
   * Only called when TrendingFeed is mounted
   */
  private setupAppStateListener(): void {
    if (this.appStateSubscription) {
      return; // Already set up
    }

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );

    DevLogger.log('TrendingFeedSessionManager: AppState listener enabled');
  }

  /**
   * Remove AppState listener
   * Only called when TrendingFeed is unmounted
   */
  private removeAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;

      DevLogger.log('TrendingFeedSessionManager: AppState listener disabled');
    }
  }

  /**
   * Handle app state changes
   * Only fires when TrendingFeed is mounted (listener is enabled)
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // If session ended (from backgrounding), start a new one with 'background' entry point
      if (this.sessionEnded) {
        DevLogger.log(
          'TrendingFeedSessionManager: App returned from background, starting new session',
        );
        this.startSession('background');
      } else {
        // Otherwise just resume the timer
        this.resumeSession();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App backgrounding = session ends
      this.endSession();
    }
  }

  /**
   * Pause session timer (accumulate elapsed time)
   */
  private pauseSession(): void {
    if (this.lastActiveTime) {
      const now = Date.now();
      const elapsed = (now - this.lastActiveTime) / 1000;
      this.accumulatedTime += elapsed;
      this.lastActiveTime = null;

      DevLogger.log('TrendingFeedSessionManager: Session paused', {
        accumulatedTime: this.accumulatedTime,
        sessionId: this.sessionId,
      });
    }
  }

  /**
   * Resume session timer (if session is active)
   */
  private resumeSession(): void {
    if (this.sessionId && !this.sessionEnded) {
      this.lastActiveTime = Date.now();

      DevLogger.log('TrendingFeedSessionManager: Session resumed', {
        sessionId: this.sessionId,
      });
    }
  }

  /**
   * Get total elapsed session time in seconds
   */
  private getElapsedTime(): number {
    let totalTime = this.accumulatedTime;

    if (this.lastActiveTime) {
      const now = Date.now();
      const currentElapsed = (now - this.lastActiveTime) / 1000;
      totalTime += currentElapsed;
    }

    return Math.round(totalTime);
  }

  /**
   * Reset all session state
   */
  private reset(): void {
    this.sessionId = null;
    this.sessionEnded = false;
    this.entryPoint = undefined;
    this.startTime = null;
    this.accumulatedTime = 0;
    this.lastActiveTime = null;
  }

  /**
   * Track feed viewed event with interaction type
   */
  private trackEvent(
    interactionType: TrendingInteractionType,
    isSessionEnd: boolean = false,
  ): void {
    if (!this.sessionId) return;

    const analyticsProperties = {
      session_id: this.sessionId,
      interaction_type: interactionType,
      session_time: this.getElapsedTime(),
      is_session_end: isSessionEnd,
      entry_point: this.entryPoint,
    };

    // TODO: Remove before merging - temporary debug log
    // eslint-disable-next-line no-console
    console.log(
      `${isSessionEnd ? '🛑' : '🚀'} TRENDING_FEED_VIEWED [${interactionType}]`,
      analyticsProperties,
    );

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track token click event
   * @param properties - Token click properties including position, filters, etc.
   */
  public trackTokenClick(properties: TokenClickProperties): void {
    if (!this.sessionId) {
      DevLogger.log(
        'TrendingFeedSessionManager: Cannot track token click - no active session',
      );
      return;
    }

    const analyticsProperties = {
      session_id: this.sessionId,
      interaction_type: TrendingInteractionType.TokenClick,
      ...properties,
    };

    DevLogger.log('TrendingFeedSessionManager: Token click tracked', {
      sessionId: this.sessionId,
      token_symbol: properties.token_symbol,
      position: properties.position,
    });

    // TODO: Remove before merging - temporary debug log
    // eslint-disable-next-line no-console
    console.log('🔥 TRENDING_FEED_VIEWED [token_click]', analyticsProperties);

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track search event
   * @param properties - Search properties including query, results count, etc.
   */
  public trackSearch(properties: SearchProperties): void {
    if (!this.sessionId) {
      DevLogger.log(
        'TrendingFeedSessionManager: Cannot track search - no active session',
      );
      return;
    }

    const analyticsProperties = {
      session_id: this.sessionId,
      interaction_type: TrendingInteractionType.Search,
      ...properties,
    };

    DevLogger.log('TrendingFeedSessionManager: Search tracked', {
      sessionId: this.sessionId,
      search_query: properties.search_query,
      results_count: properties.results_count,
    });

    // TODO: Remove before merging - temporary debug log
    // eslint-disable-next-line no-console
    console.log('🔍 TRENDING_FEED_VIEWED [search]', analyticsProperties);

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Track filter change event
   * @param properties - Filter change properties including type, previous/new values
   */
  public trackFilterChange(properties: FilterChangeProperties): void {
    if (!this.sessionId) {
      DevLogger.log(
        'TrendingFeedSessionManager: Cannot track filter change - no active session',
      );
      return;
    }

    const analyticsProperties = {
      session_id: this.sessionId,
      interaction_type: TrendingInteractionType.FilterChange,
      ...properties,
    };

    DevLogger.log('TrendingFeedSessionManager: Filter change tracked', {
      sessionId: this.sessionId,
      filter_type: properties.filter_type,
      previous_value: properties.previous_value,
      new_value: properties.new_value,
    });

    // TODO: Remove before merging - temporary debug log
    // eslint-disable-next-line no-console
    console.log('⚙️ TRENDING_FEED_VIEWED [filter_change]', analyticsProperties);

    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRENDING_FEED_VIEWED,
      )
        .addProperties(analyticsProperties)
        .build(),
    );
  }

  /**
   * Start a new session
   * @param entryPoint - How the user entered the feed
   * @param initialTab - Initial active tab
   */
  public startSession(entryPoint?: string): void {
    // If previous session ended, reset everything for new session
    if (this.sessionEnded) {
      this.reset();
    }

    // If session already active, ignore
    if (this.sessionId) {
      DevLogger.log('TrendingFeedSessionManager: Session already active', {
        sessionId: this.sessionId,
      });
      return;
    }

    // Start new session
    const now = Date.now();
    this.sessionId = uuidv4();
    this.entryPoint = entryPoint;
    this.startTime = now;
    this.lastActiveTime = now;
    this.accumulatedTime = 0;
    this.sessionEnded = false;

    DevLogger.log('TrendingFeedSessionManager: Session started', {
      sessionId: this.sessionId,
      entryPoint,
    });

    // Track initial event with session_start interaction type
    this.trackEvent(TrendingInteractionType.SessionStart, false);
  }

  /**
   * End current session
   * Sends final event with isSessionEnd: true
   */
  public endSession(): void {
    if (!this.sessionId || this.sessionEnded) {
      return;
    }

    // Pause timer to capture final time
    this.pauseSession();

    DevLogger.log('TrendingFeedSessionManager: Ending session', {
      sessionId: this.sessionId,
      finalTime: this.getElapsedTime(),
    });

    // Send final event with session_end interaction type
    this.trackEvent(TrendingInteractionType.SessionEnd, true);

    // Mark as ended (but keep state for debugging until next startSession)
    this.sessionEnded = true;
  }

  /**
   * Enable AppState listener
   * Call this when TrendingFeed mounts
   */
  public enableAppStateListener(): void {
    this.appStateListenerEnabled = true;
    this.setupAppStateListener();
  }

  /**
   * Disable AppState listener
   * Call this when TrendingFeed unmounts
   */
  public disableAppStateListener(): void {
    this.appStateListenerEnabled = false;
    this.removeAppStateListener();
  }

  /**
   * Cleanup - remove AppState listener and reset state
   * Call this only when completely tearing down (e.g., tests)
   */
  public destroy(): void {
    this.removeAppStateListener();
    this.reset();
  }

  /**
   * Check if user is currently in an active trending session.
   * Used for analytics to track if actions originated from trending feed.
   * @returns true if there's an active (non-ended) trending session
   */
  public get isFromTrending(): boolean {
    return this.sessionId !== null && !this.sessionEnded;
  }
}

// Export singleton instance
export default TrendingFeedSessionManager;
