import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';

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
  private connectionRefCount = 0;
  private initPromise: Promise<void> | null = null;
  private hasPreloaded = false;
  private prewarmCleanups: (() => void)[] = [];

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  static getInstance(): PerpsConnectionManagerClass {
    if (!PerpsConnectionManagerClass.instance) {
      PerpsConnectionManagerClass.instance = new PerpsConnectionManagerClass();
    }
    return PerpsConnectionManagerClass.instance;
  }

  async connect(): Promise<void> {
    this.connectionRefCount++;
    DevLogger.log(
      `PerpsConnectionManager: Connection requested (refCount: ${this.connectionRefCount})`,
    );

    // If already connecting, return the existing promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // Check if we think we're connected but the controller might be disconnected
    // This handles the case where state gets out of sync
    if (this.isConnected) {
      try {
        // Quick check to see if connection is actually alive
        await Engine.context.PerpsController.getAccountState();
        return Promise.resolve();
      } catch (error) {
        // Connection is stale, reset state and reconnect
        DevLogger.log(
          'PerpsConnectionManager: Stale connection detected, reconnecting',
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

  async disconnect(): Promise<void> {
    this.connectionRefCount--;
    DevLogger.log(
      `PerpsConnectionManager: Disconnection requested (refCount: ${this.connectionRefCount})`,
    );

    // Only disconnect when all references are gone
    if (this.connectionRefCount <= 0) {
      this.connectionRefCount = 0; // Ensure it doesn't go negative

      if (this.isConnected || this.isInitialized) {
        try {
          DevLogger.log(
            'PerpsConnectionManager: Disconnecting (no more references)',
          );

          // Clean up preloaded subscriptions
          this.cleanupPreloadedSubscriptions();

          // Reset state before disconnecting to prevent race conditions
          this.isConnected = false;
          this.isInitialized = false;
          this.isConnecting = false;
          this.hasPreloaded = false; // Reset pre-load flag on disconnect

          await Engine.context.PerpsController.disconnect();
        } catch (error) {
          DevLogger.log('PerpsConnectionManager: Disconnection error', error);
        }
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

      // Pre-warm the positions, orders, and account channels
      // This creates persistent subscriptions that keep connections alive
      // Store cleanup functions to call when leaving Perps
      const positionCleanup = streamManager.positions.prewarm();
      const orderCleanup = streamManager.orders.prewarm();
      const accountCleanup = streamManager.account.prewarm();

      this.prewarmCleanups.push(positionCleanup, orderCleanup, accountCleanup);

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
    };
  }
}

export const PerpsConnectionManager = PerpsConnectionManagerClass.getInstance();
