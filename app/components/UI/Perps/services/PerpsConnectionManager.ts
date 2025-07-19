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

    // If already connected or connecting, just return the existing promise
    if (this.isConnected) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
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

      if (this.isConnected) {
        try {
          DevLogger.log(
            'PerpsConnectionManager: Disconnecting (no more references)',
          );
          await Engine.context.PerpsController.disconnect();
          this.isConnected = false;
          this.isInitialized = false;
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
