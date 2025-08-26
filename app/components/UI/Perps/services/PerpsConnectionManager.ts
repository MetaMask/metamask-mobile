import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectPerpsNetwork } from '../selectors/perpsController';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';

// Constants for throttle timing
const BALANCE_UPDATE_THROTTLE_MS = 15000; // Update at most every 15 seconds to reduce state updates
const INITIAL_DATA_DELAY_MS = 100; // Delay to allow initial data to load

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
  private lastBalanceUpdateTime = 0;
  private balanceUpdateThrottleMs = BALANCE_UPDATE_THROTTLE_MS;

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

        // Trigger connection
        await Engine.context.PerpsController.getAccountState();

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

      // Re-establish connection
      this.isConnecting = true;

      // Trigger connection with new account
      await Engine.context.PerpsController.getAccountState();

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
   * Update persisted perps balances in controller state
   * This is called when account or position data changes
   */
  private updatePerpsBalances(): void {
    const now = Date.now();
    // Throttle updates to prevent too frequent state changes
    if (now - this.lastBalanceUpdateTime < this.balanceUpdateThrottleMs) {
      return;
    }

    try {
      const controller = Engine.context.PerpsController;
      const currentAccount = controller.state.accountState;

      if (currentAccount) {
        // Update persisted balances
        controller.updatePerpsBalances(currentAccount);
        this.lastBalanceUpdateTime = now;

        DevLogger.log('PerpsConnectionManager: Updated persisted balances');
      }
    } catch (error) {
      DevLogger.log('PerpsConnectionManager: Failed to update balances', error);
    }
  }

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

      // Pre-warm the positions, orders, account, and market data channels
      // This creates persistent subscriptions that keep connections alive
      // Store cleanup functions to call when leaving Perps
      const positionCleanup = streamManager.positions.prewarm();
      const orderCleanup = streamManager.orders.prewarm();
      const accountCleanup = streamManager.account.prewarm();
      const marketDataCleanup = streamManager.marketData.prewarm();

      // Add subscriptions that update persisted balances for portfolio
      // Account updates (includes totalValue and unrealizedPnl) - throttled
      const balanceAccountCleanup = streamManager.account.subscribe({
        callback: () => this.updatePerpsBalances(),
        throttleMs: this.balanceUpdateThrottleMs,
      });

      // Position updates (immediate, no throttling for actual position changes)
      const balancePositionCleanup = streamManager.positions.subscribe({
        callback: () => this.updatePerpsBalances(),
        throttleMs: 0, // No throttling for position changes
      });

      this.prewarmCleanups.push(
        positionCleanup,
        orderCleanup,
        accountCleanup,
        marketDataCleanup,
        balanceAccountCleanup,
        balancePositionCleanup,
      );

      // Give subscriptions a moment to receive initial data
      await new Promise((resolve) =>
        setTimeout(resolve, INITIAL_DATA_DELAY_MS),
      );

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
