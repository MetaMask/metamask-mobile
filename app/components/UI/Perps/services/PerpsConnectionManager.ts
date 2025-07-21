import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';

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
          // Reset state before disconnecting to prevent race conditions
          this.isConnected = false;
          this.isInitialized = false;
          this.isConnecting = false;

          await Engine.context.PerpsController.disconnect();
        } catch (error) {
          DevLogger.log('PerpsConnectionManager: Disconnection error', error);
        }
      }
    }
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
