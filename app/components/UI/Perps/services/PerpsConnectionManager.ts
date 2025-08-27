import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectPerpsNetwork } from '../selectors/perpsController';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import { PERPS_ERROR_CODES } from '../controllers/PerpsController';

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
  private connectionRefCount = 0;
  private initPromise: Promise<void> | null = null;
  private disconnectPromise: Promise<void> | null = null;
  private hasPreloaded = false;
  private prewarmCleanups: (() => void)[] = [];
  private unsubscribeFromStore: (() => void) | null = null;
  private previousAddress: string | undefined;
  private previousPerpsNetwork: 'mainnet' | 'testnet' | undefined;

  private constructor() {
    // Private constructor to enforce singleton pattern
    // Monitoring will be set up on first connect
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

    // Subscribe to Redux store changes
    this.unsubscribeFromStore = store.subscribe(() => {
      const currentState = store.getState();
      const currentEvmAccount =
        selectSelectedInternalAccountByScope(currentState)('eip155:1');
      const currentAddress = currentEvmAccount?.address;
      const currentPerpsNetwork = selectPerpsNetwork(currentState);

      const hasAccountChanged =
        this.previousAddress !== undefined &&
        this.previousAddress !== currentAddress;
      const hasPerpsNetworkChanged =
        this.previousPerpsNetwork !== undefined &&
        this.previousPerpsNetwork !== currentPerpsNetwork;

      // If account or network changed and we're connected, trigger reconnection
      if ((hasAccountChanged || hasPerpsNetworkChanged) && this.isConnected) {
        DevLogger.log(
          'PerpsConnectionManager: Account or network change detected',
          {
            accountChanged: hasAccountChanged,
            networkChanged: hasPerpsNetworkChanged,
            previousAddress: this.previousAddress,
            currentAddress,
            previousNetwork: this.previousPerpsNetwork,
            currentNetwork: currentPerpsNetwork,
          },
        );

        // Trigger reconnection asynchronously
        this.reconnectWithNewContext().catch((error) => {
          DevLogger.log(
            'PerpsConnectionManager: Failed to reconnect after account/network change',
            error,
          );
        });
      }

      // Update tracked values
      this.previousAddress = currentAddress;
      this.previousPerpsNetwork = currentPerpsNetwork;
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
      DevLogger.log('PerpsConnectionManager: State monitoring cleaned up');
    }
  }

  static getInstance(): PerpsConnectionManagerClass {
    if (!PerpsConnectionManagerClass.instance) {
      PerpsConnectionManagerClass.instance = new PerpsConnectionManagerClass();
    }
    return PerpsConnectionManagerClass.instance;
  }

  async connect(): Promise<void> {
    // Wait if we're still disconnecting
    if (this.isDisconnecting && this.disconnectPromise) {
      DevLogger.log(
        'PerpsConnectionManager: Waiting for disconnection to complete before connecting',
      );
      await this.disconnectPromise;
      // Add small delay to ensure cleanup is complete
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Set up monitoring when first entering Perps (refCount 0 -> 1)
    if (this.connectionRefCount === 0) {
      this.setupStateMonitoring();
    }

    this.connectionRefCount++;
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

    // Check if we think we're connected but the controller might be disconnected
    // This handles the case where state gets out of sync
    if (this.isConnected) {
      try {
        // Quick check to see if connection is actually alive
        await Engine.context.PerpsController.getAccountState();
        DevLogger.log(
          'PerpsConnectionManager: Connection is already active and healthy',
        );
        return Promise.resolve();
      } catch (error) {
        // Connection is stale, reset state and reconnect
        DevLogger.log(
          'PerpsConnectionManager: Stale connection detected, will reconnect',
          error,
        );
        this.isConnected = false;
        this.isInitialized = false;
      }
    }

    this.isConnecting = true;

    this.initPromise = (async () => {
      try {
        DevLogger.log('PerpsConnectionManager: Initializing connection');

        // Initialize the controller first
        await Engine.context.PerpsController.initializeProviders();
        this.isInitialized = true;

        // Trigger connection - may fail if still initializing
        try {
          await Engine.context.PerpsController.getAccountState();
        } catch (error) {
          // If it's a CLIENT_REINITIALIZING error, wait and retry once
          if (
            error instanceof Error &&
            error.message === PERPS_ERROR_CODES.CLIENT_REINITIALIZING
          ) {
            DevLogger.log(
              'PerpsConnectionManager: Provider reinitializing, retrying...',
              {
                error: error.message,
              },
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
            await Engine.context.PerpsController.getAccountState();
          } else {
            throw error;
          }
        }

        this.isConnected = true;
        this.isConnecting = false;
        DevLogger.log('PerpsConnectionManager: Successfully connected');

        // Pre-load positions and orders subscriptions to populate cache
        await this.preloadSubscriptions();
      } catch (error) {
        this.isConnecting = false;
        this.isConnected = false;
        this.isInitialized = false;
        DevLogger.log('PerpsConnectionManager: Connection failed', error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Force reconnection with new account/network context
   * Used when user switches accounts or networks
   */
  async reconnectWithNewContext(): Promise<void> {
    DevLogger.log(
      'PerpsConnectionManager: Reconnecting with new account/network context',
    );

    try {
      // Clean up existing connections
      this.cleanupPreloadedSubscriptions();

      // Clear all cached data from StreamManager to reset UI immediately
      const streamManager = getStreamManagerInstance();
      streamManager.prices.clearCache();
      streamManager.positions.clearCache();
      streamManager.orders.clearCache();
      streamManager.account.clearCache();
      streamManager.marketData.clearCache();

      // Reset state
      this.isConnected = false;
      this.isInitialized = false;
      this.isConnecting = false;
      this.hasPreloaded = false;

      // Force the controller to reinitialize with new context
      await Engine.context.PerpsController.reconnectWithNewContext();

      // Wait a bit for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Re-establish connection
      this.isConnecting = true;

      // Trigger connection with new account - wrap in try/catch to handle initialization errors
      try {
        await Engine.context.PerpsController.getAccountState();
      } catch (error) {
        // If it's a CLIENT_NOT_INITIALIZED or CLIENT_REINITIALIZING error, wait and retry once
        if (
          error instanceof Error &&
          (error.message === PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED ||
            error.message === PERPS_ERROR_CODES.CLIENT_REINITIALIZING)
        ) {
          DevLogger.log(
            'PerpsConnectionManager: Waiting for initialization to complete',
            {
              error: error.message,
            },
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          await Engine.context.PerpsController.getAccountState();
        } else {
          throw error;
        }
      }

      this.isConnected = true;
      this.isInitialized = true;
      this.isConnecting = false;
      DevLogger.log(
        'PerpsConnectionManager: Successfully reconnected with new context',
      );

      // Pre-load subscriptions again with new account
      await this.preloadSubscriptions();
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      this.isInitialized = false;
      DevLogger.log(
        'PerpsConnectionManager: Reconnection with new context failed',
        error,
      );
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connectionRefCount--;
    DevLogger.log(
      `PerpsConnectionManager: Disconnection requested (refCount: ${this.connectionRefCount})`,
    );

    // Only disconnect when all references are gone
    if (this.connectionRefCount <= 0) {
      this.connectionRefCount = 0; // Ensure it doesn't go negative

      if (this.isConnected || this.isInitialized) {
        // Track that we're disconnecting
        this.isDisconnecting = true;

        this.disconnectPromise = (async () => {
          try {
            DevLogger.log(
              'PerpsConnectionManager: Disconnecting (no more references)',
            );

            // Clean up preloaded subscriptions
            this.cleanupPreloadedSubscriptions();

            // Clean up state monitoring when leaving Perps
            this.cleanupStateMonitoring();

            // Reset state before disconnecting to prevent race conditions
            this.isConnected = false;
            this.isInitialized = false;
            this.isConnecting = false;
            this.hasPreloaded = false; // Reset pre-load flag on disconnect

            await Engine.context.PerpsController.disconnect();

            DevLogger.log('PerpsConnectionManager: Disconnection complete');
          } catch (error) {
            DevLogger.log('PerpsConnectionManager: Disconnection error', error);
          } finally {
            this.isDisconnecting = false;
            this.disconnectPromise = null;
          }
        })();

        await this.disconnectPromise;
      } else {
        // Even if not connected, clean up monitoring when leaving Perps
        this.cleanupStateMonitoring();
      }
    }
  }

  /**
   * Pre-load critical WebSocket subscriptions to populate cache
   * This ensures positions and orders are available immediately when components mount
   * Uses the StreamManager singleton to ensure single WebSocket connections
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

      // Price channel prewarm is async and subscribes to all market prices
      const priceCleanup = await streamManager.prices.prewarm();

      this.prewarmCleanups.push(
        positionCleanup,
        orderCleanup,
        accountCleanup,
        marketDataCleanup,
        priceCleanup,
      );

      // Give subscriptions a moment to receive initial data
      await new Promise((resolve) => setTimeout(resolve, 100));

      DevLogger.log(
        'PerpsConnectionManager: Pre-loading complete with persistent subscriptions',
      );
    } catch (error) {
      DevLogger.log(
        'PerpsConnectionManager: Failed to pre-load subscriptions',
        error,
      );
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
}

export const PerpsConnectionManager = PerpsConnectionManagerClass.getInstance();
export default PerpsConnectionManager;
