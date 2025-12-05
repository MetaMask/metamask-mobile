import { captureException, setMeasurement } from '@sentry/react-native';
import BackgroundTimer from 'react-native-background-timer';
import performance from 'react-native-performance';
import { v4 as uuidv4 } from 'uuid';
import NetInfo from '@react-native-community/netinfo';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { store } from '../../../../store';
import Device from '../../../../util/device';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import Logger from '../../../../util/Logger';
import { PERPS_CONSTANTS, PERFORMANCE_CONFIG } from '../constants/perpsConfig';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import { selectPerpsNetwork } from '../selectors/perpsController';
import { selectHip3ConfigVersion } from '../selectors/featureFlags';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import type { ReconnectOptions } from '../types/perps-types';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';
import { ensureError } from '../utils/perpsErrorHandler';
import { wait } from '../utils/wait';

/**
 * Singleton manager for Perps connection state
 * This ensures that both PerpsScreenStack and PerpsModalStack
 * share the same connection state and lifecycle
 */
class PerpsConnectionManagerClass {
  private static instance: PerpsConnectionManagerClass;
  private isConnected = false;
  private isConnecting = false;
  private isInitialized = false;
  private isDisconnecting = false;
  private error: string | null = null;
  private connectionRefCount = 0;
  private initPromise: Promise<void> | null = null;
  private disconnectPromise: Promise<void> | null = null;
  private hasPreloaded = false;
  private prewarmCleanups: (() => void)[] = [];
  private unsubscribeFromStore: (() => void) | null = null;
  private previousAddress: string | undefined;
  private previousPerpsNetwork: 'mainnet' | 'testnet' | undefined;
  private previousHip3Version: number = 0;
  private gracePeriodTimer: number | null = null;
  private isInGracePeriod = false;
  private pendingReconnectPromise: Promise<void> | null = null;
  private connectionTimeoutRef: ReturnType<typeof setTimeout> | null = null;
  private networkStateUnsubscribe: (() => void) | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastSuccessfulHealthCheck: number | null = null;
  private wasNetworkDisconnected = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
    // Monitoring will be set up on first connect
  }

  /**
   * Set up network state monitoring to detect network reconnection
   */
  private setupNetworkMonitoring(): void {
    // Only set up if not already monitoring
    if (this.networkStateUnsubscribe) {
      return;
    }

    DevLogger.log(
      'PerpsConnectionManager: Setting up network state monitoring',
    );

    // Get initial network state
    NetInfo.fetch().then((state) => {
      this.wasNetworkDisconnected = !state.isConnected;
    });

    // Subscribe to network state changes
    this.networkStateUnsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;

      // If network was disconnected and now reconnected, force reconnection
      if (this.wasNetworkDisconnected && isConnected) {
        DevLogger.log(
          'PerpsConnectionManager: Network reconnected, checking connection health',
        );
        this.wasNetworkDisconnected = false;

        // If we think we're connected but network was just restored, validate connection
        if (this.isConnected) {
          // Force reconnection to ensure WebSocket is actually working
          this.reconnectWithNewContext({ force: true }).catch((error) => {
            Logger.error(ensureError(error), {
              feature: PERPS_CONSTANTS.FEATURE_NAME,
              message: 'Error reconnecting after network restoration',
            });
          });
        }
      } else if (!isConnected) {
        this.wasNetworkDisconnected = true;
        DevLogger.log(
          'PerpsConnectionManager: Network disconnected, will reconnect when network is restored',
        );
      }
    });

    DevLogger.log('PerpsConnectionManager: Network state monitoring set up');
  }

  /**
   * Clean up network state monitoring
   */
  private cleanupNetworkMonitoring(): void {
    if (this.networkStateUnsubscribe) {
      this.networkStateUnsubscribe();
      this.networkStateUnsubscribe = null;
      this.wasNetworkDisconnected = false;
      DevLogger.log(
        'PerpsConnectionManager: Network state monitoring cleaned up',
      );
    }
  }

  /**
   * Set up periodic health checks to detect stale connections
   */
  private setupHealthChecks(): void {
    // Only set up if not already running
    if (this.healthCheckInterval) {
      return;
    }

    DevLogger.log('PerpsConnectionManager: Setting up periodic health checks');

    // Check connection health every 30 seconds
    const HEALTH_CHECK_INTERVAL_MS = 30_000;
    this.healthCheckInterval = setInterval(async () => {
      // Only check if we think we're connected
      if (!this.isConnected || this.isConnecting) {
        return;
      }

      try {
        // Perform health check ping
        const provider = Engine.context.PerpsController.getActiveProvider();
        if (provider) {
          await provider.ping();
          this.lastSuccessfulHealthCheck = Date.now();
          DevLogger.log('PerpsConnectionManager: Health check passed', {
            lastCheck: new Date(this.lastSuccessfulHealthCheck).toISOString(),
          });
        }
      } catch (error) {
        DevLogger.log(
          'PerpsConnectionManager: Health check failed, connection may be stale',
          error,
        );

        // If health check fails, force reconnection
        // Only reconnect if we haven't had a successful check in the last minute
        const timeSinceLastCheck = this.lastSuccessfulHealthCheck
          ? Date.now() - this.lastSuccessfulHealthCheck
          : Infinity;

        if (timeSinceLastCheck > 60_000) {
          DevLogger.log(
            'PerpsConnectionManager: Health check failed, forcing reconnection',
          );
          this.reconnectWithNewContext({ force: true }).catch((err) => {
            Logger.error(ensureError(err), {
              feature: PERPS_CONSTANTS.FEATURE_NAME,
              message: 'Error reconnecting after failed health check',
            });
          });
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    DevLogger.log('PerpsConnectionManager: Periodic health checks set up');
  }

  /**
   * Clean up periodic health checks
   */
  private cleanupHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.lastSuccessfulHealthCheck = null;
      DevLogger.log(
        'PerpsConnectionManager: Periodic health checks cleaned up',
      );
    }
  }

  /**
   * Set up monitoring for account and network changes
   */
  private setupStateMonitoring(): void {
    // Only set up if not already monitoring
    if (this.unsubscribeFromStore) {
      return;
    }

    // Get initial values
    const state = store.getState();
    const selectedEvmAccount =
      selectSelectedInternalAccountByScope(state)('eip155:1');
    this.previousAddress = selectedEvmAccount?.address;
    this.previousPerpsNetwork = selectPerpsNetwork(state);
    this.previousHip3Version = selectHip3ConfigVersion(state);

    // Subscribe to Redux store changes
    this.unsubscribeFromStore = store.subscribe(() => {
      const currentState = store.getState();
      const currentEvmAccount =
        selectSelectedInternalAccountByScope(currentState)('eip155:1');
      const currentAddress = currentEvmAccount?.address;
      const currentPerpsNetwork = selectPerpsNetwork(currentState);
      const currentHip3Version = selectHip3ConfigVersion(currentState);

      const hasAccountChanged =
        this.previousAddress !== undefined &&
        this.previousAddress !== currentAddress;
      const hasPerpsNetworkChanged =
        this.previousPerpsNetwork !== undefined &&
        this.previousPerpsNetwork !== currentPerpsNetwork;
      const hasHip3Changed = this.previousHip3Version !== currentHip3Version;

      // If account, network, or HIP-3 config changed and we're connected, trigger reconnection
      if (
        (hasAccountChanged || hasPerpsNetworkChanged || hasHip3Changed) &&
        this.isConnected
      ) {
        DevLogger.log(
          hasHip3Changed
            ? '[DEX:WHITELIST] PerpsConnectionManager: HIP-3 config version CHANGED - triggering reconnection'
            : 'PerpsConnectionManager: State change detected',
          {
            accountChanged: hasAccountChanged,
            networkChanged: hasPerpsNetworkChanged,
            hip3Changed: hasHip3Changed,
            previousAddress: this.previousAddress,
            currentAddress,
            previousNetwork: this.previousPerpsNetwork,
            currentNetwork: currentPerpsNetwork,
            previousHip3Version: this.previousHip3Version,
            currentHip3Version,
          },
        );

        // Immediately clear ALL cached data to prevent old account data from showing
        const streamManager = getStreamManagerInstance();

        if (hasHip3Changed) {
          DevLogger.log(
            '[DEX:WHITELIST] PerpsConnectionManager: Clearing ALL caches due to HIP-3 config change',
          );
        }

        // Clear caches immediately - this disconnects old WebSockets and sets accountAddress to null
        streamManager.positions.clearCache();
        streamManager.orders.clearCache();
        streamManager.account.clearCache();
        streamManager.prices.clearCache();
        streamManager.marketData.clearCache();
        streamManager.oiCaps.clearCache();

        // Force the controller to reconnect with new account
        // This ensures proper WebSocket reconnection at the controller level
        this.reconnectWithNewContext().catch((error) => {
          Logger.error(ensureError(error), {
            feature: PERPS_CONSTANTS.FEATURE_NAME,
            message: 'Error reconnecting with new account/network context',
          });
        });
      }

      // Update tracked values
      this.previousAddress = currentAddress;
      this.previousPerpsNetwork = currentPerpsNetwork;
      this.previousHip3Version = currentHip3Version;
    });

    DevLogger.log('PerpsConnectionManager: State monitoring set up');
  }

  /**
   * Clean up state monitoring
   */
  private cleanupStateMonitoring(): void {
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
      this.unsubscribeFromStore = null;
      this.previousAddress = undefined;
      this.previousPerpsNetwork = undefined;
      this.previousHip3Version = 0;
      DevLogger.log('PerpsConnectionManager: State monitoring cleaned up');
    }
    this.cleanupNetworkMonitoring();
    this.cleanupHealthChecks();
  }

  /**
   * Cancel active grace period timer
   */
  private cancelGracePeriod(): void {
    if (this.gracePeriodTimer) {
      if (Device.isAndroid()) {
        BackgroundTimer.clearTimeout(this.gracePeriodTimer);
      } else {
        clearTimeout(this.gracePeriodTimer);
        BackgroundTimer.stop();
      }
      this.gracePeriodTimer = null;
      this.isInGracePeriod = false;
      DevLogger.log('PerpsConnectionManager: Grace period cancelled');
    }
  }

  /**
   * Clear active connection timeout timer
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutRef) {
      clearTimeout(this.connectionTimeoutRef);
      this.connectionTimeoutRef = null;
      DevLogger.log('PerpsConnectionManager: Connection timeout cleared');
    }
  }

  /**
   * Start connection timeout timer
   * If connection takes longer than configured timeout, set error state
   */
  private startConnectionTimeout(): void {
    // Clear any existing timeout
    this.clearConnectionTimeout();

    const timeoutMs = PERPS_CONSTANTS.CONNECTION_ATTEMPT_TIMEOUT_MS;
    DevLogger.log(
      `PerpsConnectionManager: Starting ${timeoutMs}ms connection timeout`,
    );

    this.connectionTimeoutRef = setTimeout(() => {
      DevLogger.log(
        `PerpsConnectionManager: Connection timeout after ${timeoutMs}ms`,
      );
      this.isConnecting = false;
      this.isConnected = false;
      this.isInitialized = false;
      this.setError(PERPS_ERROR_CODES.CONNECTION_TIMEOUT);
      this.connectionTimeoutRef = null;
    }, timeoutMs);
  }

  /**
   * Schedule disconnection after grace period
   */
  private scheduleGracePeriodDisconnection(): void {
    // Cancel any existing timer to prevent multiple timers
    this.cancelGracePeriod();

    DevLogger.log(
      `PerpsConnectionManager: Starting grace period for ${PERPS_CONSTANTS.CONNECTION_GRACE_PERIOD_MS}ms`,
    );
    this.isInGracePeriod = true;

    if (Device.isIos()) {
      // iOS: Start background timer, schedule with setTimeout, then stop immediately
      BackgroundTimer.start();
      this.gracePeriodTimer = setTimeout(() => {
        this.performActualDisconnection().catch((error) => {
          Logger.error(ensureError(error), {
            feature: PERPS_CONSTANTS.FEATURE_NAME,
            message: 'Error performing actual disconnection',
          });
        });
      }, PERPS_CONSTANTS.CONNECTION_GRACE_PERIOD_MS) as unknown as number;
      // Stop immediately after scheduling (not in the callback)
      BackgroundTimer.stop();
    } else if (Device.isAndroid()) {
      // Android uses BackgroundTimer.setTimeout directly
      this.gracePeriodTimer = BackgroundTimer.setTimeout(() => {
        this.performActualDisconnection().catch((error) => {
          Logger.error(ensureError(error), {
            feature: PERPS_CONSTANTS.FEATURE_NAME,
            message: 'Error performing actual disconnection',
          });
        });
      }, PERPS_CONSTANTS.CONNECTION_GRACE_PERIOD_MS);
    }
  }

  /**
   * Perform the actual disconnection after grace period expires
   */
  private async performActualDisconnection(): Promise<void> {
    DevLogger.log(
      `PerpsConnectionManager: Grace period expired, performing disconnection (refCount: ${this.connectionRefCount})`,
    );

    // Reset grace period state
    this.gracePeriodTimer = null;
    this.isInGracePeriod = false;

    // Only disconnect if we still have no references
    if (this.connectionRefCount <= 0) {
      if (this.isConnected || this.isInitialized) {
        // Track that we're disconnecting
        this.isDisconnecting = true;

        this.disconnectPromise = (async () => {
          try {
            DevLogger.log(
              'PerpsConnectionManager: Performing actual disconnection after grace period',
            );

            // Clean up preloaded subscriptions
            this.cleanupPreloadedSubscriptions();

            // Reset state before disconnecting to prevent race conditions
            this.isConnected = false;
            this.isInitialized = false;
            this.isConnecting = false;
            this.hasPreloaded = false; // Reset pre-load flag on disconnect
            this.lastSuccessfulHealthCheck = null;
            this.clearError(); // Clear any errors on disconnect

            // Stop health checks when disconnecting
            this.cleanupHealthChecks();

            await Engine.context.PerpsController.disconnect();

            // Clean up monitoring when fully disconnected
            this.cleanupStateMonitoring();

            DevLogger.log(
              'PerpsConnectionManager: Actual disconnection complete',
            );
          } catch (error) {
            Logger.error(ensureError(error), {
              feature: PERPS_CONSTANTS.FEATURE_NAME,
            });
          } finally {
            this.isDisconnecting = false;
            this.disconnectPromise = null;
          }
        })();

        await this.disconnectPromise;
      }
    } else {
      DevLogger.log(
        `PerpsConnectionManager: Grace period expired but refCount is now ${this.connectionRefCount}, skipping disconnection`,
      );
    }
  }

  static getInstance(): PerpsConnectionManagerClass {
    if (!PerpsConnectionManagerClass.instance) {
      PerpsConnectionManagerClass.instance = new PerpsConnectionManagerClass();
    }
    return PerpsConnectionManagerClass.instance;
  }

  /**
   * Set error state
   */
  private setError(error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.error = errorMessage;
    DevLogger.log('PerpsConnectionManager: Error set', errorMessage);
  }

  /**
   * Clear error state
   */
  private clearError(): void {
    if (this.error) {
      DevLogger.log('PerpsConnectionManager: Error cleared');
      this.error = null;
    }
  }

  /**
   * Reset error state (public method for UI)
   */
  resetError(): void {
    this.clearError();
  }

  /**
   * Force an error state for development/testing purposes only
   */
  forceError(error: string): void {
    if (__DEV__) {
      this.setError(error);
    }
  }

  async connect(): Promise<void> {
    // Cancel any active grace period when reconnecting
    if (this.isInGracePeriod) {
      DevLogger.log(
        'PerpsConnectionManager: Cancelling grace period due to reconnection',
      );
      this.cancelGracePeriod();
    }

    // Wait if we're still disconnecting
    if (this.isDisconnecting && this.disconnectPromise) {
      DevLogger.log(
        'PerpsConnectionManager: Waiting for disconnection to complete before connecting',
      );
      await this.disconnectPromise;
      // Add small delay to ensure cleanup is complete
      await wait(PERPS_CONSTANTS.RECONNECTION_CLEANUP_DELAY_MS);
    }

    // Set up monitoring when first entering Perps (refCount 0 -> 1)
    if (this.connectionRefCount === 0) {
      this.setupStateMonitoring();
      this.setupNetworkMonitoring();
    }

    // Increment refCount BEFORE any early returns to prevent reference count mismatch
    this.connectionRefCount++;

    // Wait if we're already reconnecting
    if (this.pendingReconnectPromise) {
      DevLogger.log(
        'PerpsConnectionManager: Waiting for reconnection to complete before connecting',
      );
      await this.pendingReconnectPromise;
      // After reconnection completes, check if we still need to connect
      if (this.isConnected) {
        this.clearError();
        return Promise.resolve();
      }
    }
    DevLogger.log(
      `PerpsConnectionManager: Connection requested (refCount: ${this.connectionRefCount}, isConnected: ${this.isConnected}, isInitialized: ${this.isInitialized})`,
    );

    // If already connecting, return the existing promise
    if (this.initPromise) {
      DevLogger.log(
        'PerpsConnectionManager: Already connecting, returning existing promise',
      );
      return this.initPromise;
    }

    // If already connected, validate the connection is actually working
    // This prevents stale connections from appearing as "connected"
    if (this.isConnected) {
      try {
        // Validate connection with health check ping
        const provider = Engine.context.PerpsController.getActiveProvider();
        if (provider) {
          await provider.ping();
          this.lastSuccessfulHealthCheck = Date.now();
          this.clearError();
          // Start health checks if not already running
          if (!this.healthCheckInterval) {
            this.setupHealthChecks();
          }
          return Promise.resolve();
        }
      } catch (error) {
        DevLogger.log(
          'PerpsConnectionManager: Connection validation failed, reconnecting',
          error,
        );
        // Connection is stale, force reconnection
        this.isConnected = false;
        this.isInitialized = false;
        // Fall through to reconnect
      }
    }

    this.isConnecting = true;
    // Clear previous errors when starting connection attempt
    this.clearError();

    // Start connection timeout to prevent hanging indefinitely
    this.startConnectionTimeout();

    this.initPromise = (async () => {
      const traceId = uuidv4();
      const connectionStartTime = performance.now();
      let traceData: Record<string, string | number | boolean> | undefined;

      try {
        const traceSpan = trace({
          name: TraceName.PerpsConnectionEstablishment,
          id: traceId,
          op: TraceOperation.PerpsOperation,
        });

        DevLogger.log('PerpsConnectionManager: Initializing connection');

        // Stage 1: Initialize providers
        const initStart = performance.now();
        await Engine.context.PerpsController.init();
        this.isInitialized = true;
        setMeasurement(
          PerpsMeasurementName.PERPS_PROVIDER_INIT,
          performance.now() - initStart,
          'millisecond',
          traceSpan,
        );

        // Validate connection with WebSocket health check ping before marking as connected
        // This ensures the WebSocket connection is actually responsive without expensive API calls
        DevLogger.log(
          'PerpsConnectionManager: Validating connection with WebSocket health check ping',
        );
        const healthCheckStart = performance.now();
        const provider = Engine.context.PerpsController.getActiveProvider();
        await provider.ping();
        setMeasurement(
          PerpsMeasurementName.PERPS_CONNECTION_HEALTH_CHECK,
          performance.now() - healthCheckStart,
          'millisecond',
          traceSpan,
        );

        // Check if timeout fired during health check - respect timeout decision
        if (this.error === PERPS_ERROR_CODES.CONNECTION_TIMEOUT) {
          // Timeout already set error state, bail out early without overriding
          traceData = {
            success: false,
            error: 'Connection timeout during health check',
          };
          return; // Skip to finally block for trace cleanup
        }

        // Clear connection timeout after successful health check
        this.clearConnectionTimeout();

        // Mark as connected - WebSocket connection validated and ready
        this.isConnected = true;
        this.isConnecting = false;
        this.lastSuccessfulHealthCheck = Date.now();
        // Clear errors on successful connection
        this.clearError();

        // Start periodic health checks to detect stale connections
        this.setupHealthChecks();

        // Track WebSocket connection establishment performance (pure connection)
        const connectionDuration = performance.now() - connectionStartTime;

        // Log connection performance measurement with consistent marker
        DevLogger.log(
          `${PERFORMANCE_CONFIG.LOGGING_MARKERS.WEBSOCKET_PERFORMANCE} PerpsConn: Connection established`,
          {
            metric:
              PerpsMeasurementName.PERPS_WEBSOCKET_CONNECTION_ESTABLISHMENT,
            duration: `${connectionDuration.toFixed(0)}ms`,
          },
        );

        setMeasurement(
          PerpsMeasurementName.PERPS_WEBSOCKET_CONNECTION_ESTABLISHMENT,
          connectionDuration,
          'millisecond',
          traceSpan,
        );

        DevLogger.log('PerpsConnectionManager: Successfully connected');

        // Stage 3: Pre-load positions and orders subscriptions to populate cache
        const preloadStart = performance.now();
        await this.preloadSubscriptions();
        setMeasurement(
          PerpsMeasurementName.PERPS_SUBSCRIPTIONS_PRELOAD,
          performance.now() - preloadStart,
          'millisecond',
          traceSpan,
        );

        // Track total connection time including preload (user-perceived performance)
        const totalConnectionDuration = performance.now() - connectionStartTime;

        // Log connection with preload performance measurement
        DevLogger.log(
          `${PERFORMANCE_CONFIG.LOGGING_MARKERS.WEBSOCKET_PERFORMANCE} PerpsConn: Connection with preload completed`,
          {
            metric:
              PerpsMeasurementName.PERPS_WEBSOCKET_CONNECTION_WITH_PRELOAD,
            duration: `${totalConnectionDuration.toFixed(0)}ms`,
          },
        );

        setMeasurement(
          PerpsMeasurementName.PERPS_WEBSOCKET_CONNECTION_WITH_PRELOAD,
          totalConnectionDuration,
          'millisecond',
          traceSpan,
        );

        traceData = {
          success: true,
        };
      } catch (error) {
        this.isConnecting = false;
        this.isConnected = false;
        this.isInitialized = false;

        // Clear connection timeout on error
        this.clearConnectionTimeout();

        // Capture exception with connection context
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            tags: {
              component: 'PerpsConnectionManager',
              action: 'connection_connection',
              operation: 'connection_management',
              provider: 'hyperliquid',
            },
            extra: {
              connectionContext: {
                provider: 'hyperliquid',
                timestamp: new Date().toISOString(),
                isTestnet:
                  Engine.context.PerpsController?.getCurrentNetwork?.() ===
                  'testnet',
              },
            },
          },
        );

        traceData = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        // Set error state for UI
        this.setError(
          error instanceof Error ? error : new Error(String(error)),
        );
        DevLogger.log('PerpsConnectionManager: Connection failed', error);
        throw error;
      } finally {
        endTrace({
          name: TraceName.PerpsConnectionEstablishment,
          id: traceId,
          data: traceData,
        });
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Force reconnection with new account/network context
   * Used when user switches accounts or networks
   * @param options - Reconnection options
   */
  async reconnectWithNewContext(options?: ReconnectOptions): Promise<void> {
    const force = options?.force ?? false;

    if (force) {
      // Force mode: Cancel all pending operations and start fresh
      DevLogger.log(
        'PerpsConnectionManager: Force reconnection - cancelling pending operations',
      );

      // Cancel grace period immediately on force reconnect
      this.cancelGracePeriod();

      // Clear connection timeout if active
      this.clearConnectionTimeout();

      // Clear all pending promises to cancel in-flight operations
      // Note: Actual disconnect happens in performReconnection → Controller.init → performInitialization
      this.isConnecting = false;
      this.initPromise = null;
      this.pendingReconnectPromise = null;
    } else {
      // Wait for pending initialization if exists
      if (this.initPromise) {
        DevLogger.log(
          'PerpsConnectionManager: Waiting for pending initialization before reconnecting',
        );
        await this.initPromise;
        // After init completes, check if we're already connected
        if (this.isConnected) {
          return;
        }
      }

      // If already reconnecting, return existing promise
      if (this.pendingReconnectPromise) {
        return this.pendingReconnectPromise;
      }
    }

    // Create a new reconnection promise
    this.pendingReconnectPromise = this.performReconnection();

    try {
      await this.pendingReconnectPromise;
    } finally {
      this.pendingReconnectPromise = null;
    }
  }

  /**
   * Performs the actual reconnection logic
   */
  private async performReconnection(): Promise<void> {
    const traceId = uuidv4();
    const reconnectionStartTime = performance.now();
    let traceData: Record<string, string | number | boolean> | undefined;

    DevLogger.log(
      'PerpsConnectionManager: Reconnecting with new account/network context',
    );

    // Set connecting state immediately to prevent race conditions
    this.isConnecting = true;

    // Start connection timeout to prevent hanging indefinitely
    this.startConnectionTimeout();

    try {
      const traceSpan = trace({
        name: TraceName.PerpsAccountSwitchReconnection,
        id: traceId,
        op: TraceOperation.PerpsOperation,
      });

      // Stage 1: Clean up existing connections and clear caches
      const cleanupStart = performance.now();
      this.cleanupPreloadedSubscriptions();

      // Clear all cached data from StreamManager to reset UI immediately
      const streamManager = getStreamManagerInstance();
      streamManager.prices.clearCache();
      streamManager.positions.clearCache();
      streamManager.orders.clearCache();
      streamManager.account.clearCache();
      streamManager.marketData.clearCache();
      streamManager.oiCaps.clearCache();
      setMeasurement(
        PerpsMeasurementName.PERPS_RECONNECTION_CLEANUP,
        performance.now() - cleanupStart,
        'millisecond',
        traceSpan,
      );

      // Reset connection state (but keep isConnecting = true)
      this.isConnected = false;
      this.isInitialized = false;
      this.hasPreloaded = false;
      this.lastSuccessfulHealthCheck = null;
      // Clear previous errors when starting reconnection attempt
      this.clearError();

      // Stop health checks during reconnection
      this.cleanupHealthChecks();

      // Stage 2: Force the controller to reinitialize with new context
      const reinitStart = performance.now();
      await Engine.context.PerpsController.init();
      setMeasurement(
        PerpsMeasurementName.PERPS_CONTROLLER_REINIT,
        performance.now() - reinitStart,
        'millisecond',
        traceSpan,
      );

      // Wait for initialization to complete - platform-specific timing for reliability
      const reconnectionDelay = Device.isAndroid()
        ? PERPS_CONSTANTS.RECONNECTION_DELAY_ANDROID_MS
        : PERPS_CONSTANTS.RECONNECTION_DELAY_IOS_MS;
      await wait(reconnectionDelay);

      // Validate connection with WebSocket health check ping before marking as connected
      // This ensures the WebSocket connection is actually responsive after reconnection without expensive API calls
      DevLogger.log(
        'PerpsConnectionManager: Validating reconnection with WebSocket health check ping',
      );
      const healthCheckStart = performance.now();
      const provider = Engine.context.PerpsController.getActiveProvider();
      await provider.ping();
      setMeasurement(
        PerpsMeasurementName.PERPS_RECONNECTION_HEALTH_CHECK,
        performance.now() - healthCheckStart,
        'millisecond',
        traceSpan,
      );

      // Check if timeout fired during health check - respect timeout decision
      if (this.error === PERPS_ERROR_CODES.CONNECTION_TIMEOUT) {
        // Timeout already set error state, bail out early without overriding
        traceData = {
          success: false,
          error: 'Connection timeout during reconnection health check',
        };
        return; // Skip to finally block for trace cleanup
      }

      // Clear connection timeout after successful health check
      this.clearConnectionTimeout();

      // Mark as connected - account data will be fetched via WebSocket subscriptions during preload
      // No need to explicitly call getAccountState() - preloadSubscriptions() handles account data
      this.isConnected = true;
      this.isInitialized = true;
      this.lastSuccessfulHealthCheck = Date.now();
      // Clear errors on successful reconnection
      this.clearError();

      // Start periodic health checks to detect stale connections
      this.setupHealthChecks();

      DevLogger.log(
        'PerpsConnectionManager: Successfully reconnected with new context',
      );

      // Stage 4: Pre-load subscriptions again with new account
      const preloadStart = performance.now();
      await this.preloadSubscriptions();
      setMeasurement(
        PerpsMeasurementName.PERPS_RECONNECTION_PRELOAD,
        performance.now() - preloadStart,
        'millisecond',
        traceSpan,
      );

      // Track account switch reconnection performance including preload
      const reconnectionDuration = performance.now() - reconnectionStartTime;

      // Log account switch reconnection performance measurement
      DevLogger.log(
        `${PERFORMANCE_CONFIG.LOGGING_MARKERS.WEBSOCKET_PERFORMANCE} PerpsConn: Account switch reconnection completed`,
        {
          metric:
            PerpsMeasurementName.PERPS_WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION,
          duration: `${reconnectionDuration.toFixed(0)}ms`,
        },
      );

      setMeasurement(
        PerpsMeasurementName.PERPS_WEBSOCKET_ACCOUNT_SWITCH_RECONNECTION,
        reconnectionDuration,
        'millisecond',
        traceSpan,
      );

      traceData = {
        success: true,
      };
    } catch (error) {
      this.isConnected = false;
      this.isInitialized = false;

      // Clear connection timeout on error
      this.clearConnectionTimeout();

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Set error state for UI - this is critical for reliability
      this.setError(error instanceof Error ? error : new Error(String(error)));
      DevLogger.log(
        'PerpsConnectionManager: Reconnection with new context failed',
        error,
      );
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsAccountSwitchReconnection,
        id: traceId,
        data: traceData,
      });
      // Always clear connecting state when done
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this.connectionRefCount--;
    DevLogger.log(
      `PerpsConnectionManager: Disconnection requested (refCount: ${this.connectionRefCount})`,
    );

    // Only start grace period when all references are gone
    if (this.connectionRefCount <= 0) {
      this.connectionRefCount = 0; // Ensure it doesn't go negative

      // If we're already in grace period, no need to restart it
      if (this.isInGracePeriod) {
        DevLogger.log(
          'PerpsConnectionManager: Already in grace period, keeping existing timer',
        );
        return;
      }

      // Start grace period instead of immediate disconnection
      if (this.isConnected || this.isInitialized) {
        DevLogger.log(
          'PerpsConnectionManager: Starting grace period before disconnection',
        );
        this.scheduleGracePeriodDisconnection();
      }
    }
  }

  // Balance persistence removed - portfolio balances now use live account data directly

  /**
   * Pre-load critical WebSocket subscriptions to populate cache
   * This ensures positions and orders are available immediately when components mount
   * Uses the StreamManager singleton to ensure single WebSocket connections
   * Also sets up balance update subscriptions for portfolio integration
   */
  private async preloadSubscriptions(): Promise<void> {
    // Only pre-load once per session
    if (this.hasPreloaded) {
      DevLogger.log('PerpsConnectionManager: Already pre-loaded, skipping');
      return;
    }

    try {
      DevLogger.log(
        'PerpsConnectionManager: Pre-loading WebSocket subscriptions via StreamManager',
      );
      this.hasPreloaded = true;

      // Get the singleton StreamManager instance
      const streamManager = getStreamManagerInstance();

      // Pre-warm all channels including prices for all markets
      // This creates persistent subscriptions that keep connections alive
      // Store cleanup functions to call when leaving Perps
      const positionCleanup = streamManager.positions.prewarm();
      const orderCleanup = streamManager.orders.prewarm();
      const accountCleanup = streamManager.account.prewarm();
      const marketDataCleanup = streamManager.marketData.prewarm();
      const oiCapCleanup = streamManager.oiCaps.prewarm();

      // Portfolio balance updates are now handled by usePerpsPortfolioBalance via usePerpsLiveAccount

      // Position updates are no longer needed for balance persistence since we use live streams
      // Price channel prewarm is async and subscribes to all market prices
      const priceCleanup = await streamManager.prices.prewarm();

      this.prewarmCleanups.push(
        positionCleanup,
        orderCleanup,
        accountCleanup,
        marketDataCleanup,
        oiCapCleanup,
        priceCleanup,
      );

      // Give subscriptions a moment to receive initial data
      await wait(PERPS_CONSTANTS.INITIAL_DATA_DELAY_MS);

      DevLogger.log(
        'PerpsConnectionManager: Pre-loading complete with persistent subscriptions',
      );
    } catch (error) {
      Logger.error(ensureError(error), {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        message: 'Error pre-loading subscriptions',
      });
      // Non-critical error - components will still work with on-demand subscriptions
    }
  }

  /**
   * Clean up pre-loaded subscriptions
   * Called when leaving the Perps environment
   */
  private cleanupPreloadedSubscriptions(): void {
    if (this.prewarmCleanups.length === 0) {
      DevLogger.log(
        'PerpsConnectionManager: No pre-warm subscriptions to cleanup',
      );
      return;
    }

    DevLogger.log(
      `PerpsConnectionManager: Cleaning up ${this.prewarmCleanups.length} pre-warm subscriptions`,
    );

    // Call all cleanup functions
    this.prewarmCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        DevLogger.log(
          'PerpsConnectionManager: Error during pre-warm cleanup',
          error,
        );
      }
    });

    // Clear the array
    this.prewarmCleanups = [];
    DevLogger.log('PerpsConnectionManager: Pre-warm cleanup complete');
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      isInitialized: this.isInitialized,
      isDisconnecting: this.isDisconnecting,
      isInGracePeriod: this.isInGracePeriod,
      error: this.error,
    };
  }

  /**
   * Check if the manager is fully disconnected and ready to connect
   */
  isFullyDisconnected(): boolean {
    return (
      !this.isConnected &&
      !this.isInitialized &&
      !this.isConnecting &&
      !this.isDisconnecting &&
      this.connectionRefCount === 0
    );
  }

  /**
   * Check if the manager is currently connecting
   */
  isCurrentlyConnecting(): boolean {
    return this.isConnecting;
  }
}

export const PerpsConnectionManager = PerpsConnectionManagerClass.getInstance();
export default PerpsConnectionManager;
