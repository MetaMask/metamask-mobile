import {
  MultichainWalletSnapFactory,
  WALLET_SNAP_MAP,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';
import StorageWrapper from '../../store/storage-wrapper';
import { PENDING_SRP_DISCOVERY } from '../../constants/storage';

/**
 * Interface for tracking pending account discovery operations.
 *
 * Maps keyring IDs to wallet types and their discovery status.
 * Structure: { [keyringId]: { [walletType]: boolean } }
 *
 * Example:
 * ```typescript
 * {
 *   "keyring-uuid-1": {
 *     "bitcoin": true,    // pending discovery
 *     "ethereum": false   // discovery completed
 *   },
 *   "keyring-uuid-2": {
 *     "bitcoin": true,
 *     "ethereum": true
 *   }
 * }
 * ```
 */
interface AccountDiscoveryKeyrings {
  [keyringId: string]: {
    [walletType: string]: boolean;
  };
}

/**
 * Service for managing account discovery operations across different wallet types.
 *
 * This singleton service handles the discovery of accounts for multiple keyring IDs and
 * wallet client types (Bitcoin, Ethereum, etc.), maintaining state persistence through storage.
 *
 * Key features:
 * - Prevents concurrent discovery operations to avoid conflicts
 * - Persists pending discovery state to survive app restarts
 * - Supports selective discovery by wallet type
 * - Provides synchronization methods for ongoing operations
 * - Implements proper cleanup and error handling
 *
 * Usage:
 * ```typescript
 * const service = await AccountDiscoveryService.getInstance();
 * await service.addKeyringForAcccountDiscovery(['keyring1', 'keyring2']);
 * await service.attemptAccountDiscovery();
 * ```
 */
export class AccountDiscoveryService {
  private static instance: AccountDiscoveryService;
  private static privateConstructorKey = Symbol('AccountDiscoveryService');

  /**
   * Gets the singleton instance of the AccountDiscoveryService.
   * Initializes the instance if it doesn't exist.
   * @returns The singleton instance of the AccountDiscoveryService
   */
  static async getInstance() {
    if (!this.instance) {
      this.instance = new AccountDiscoveryService(this.privateConstructorKey);
      await this.instance.init();
    }
    return this.instance;
  }

  private _pendingKeyring: AccountDiscoveryKeyrings = {};
  private discoveryRunning = false;
  private discoveryPromise: Promise<void> = Promise.resolve();

  /**
   * Gets the current pending keyring discovery operations.
   * @returns The pending keyring object containing discovery status for each keyring ID and wallet type
   */
  get pendingKeyring() {
    return this._pendingKeyring;
  }

  /**
   * Checks if account discovery is currently running.
   * @returns True if discovery is in progress, false otherwise
   */
  get isDiscoveryRunning() {
    return this.discoveryRunning;
  }

  constructor(key: symbol) {
    if (key !== AccountDiscoveryService.privateConstructorKey) {
      throw new Error('Cannot instantiate AccountDiscoveryService directly');
    }
  }

  /**
   * Waits for any currently running account discovery operation to complete.
   * This method allows callers to synchronize with ongoing discovery processes
   * without triggering a new discovery operation.
   * @returns A promise that resolves when the current discovery operation completes
   */
  syncRunningDiscovery = async (): Promise<void> => {
    await this.discoveryPromise;
  };

  /**
   * Attempts to perform account discovery for all pending keyring operations.
   * This method serves as the main entry point for triggering account discovery.
   * It sets up the discovery promise and ensures only one discovery operation runs at a time.
   * @throws {Error} If discovery is already running
   * @returns A promise that resolves when account discovery completes
   */
  attemptAccountDiscovery = async (): Promise<void> => {
    if (this.discoveryRunning) throw new Error('discovery is running');
    this.discoveryPromise = this.performAccountDiscovery();
    await this.discoveryPromise;
  };

  /**
   * Performs account discovery for all pending keyring operations across all wallet types.
   * This method:
   * 1. Sets the discovery running flag to prevent concurrent operations
   * 2. Iterates through all wallet client types (Bitcoin, Ethereum, etc.)
   * 3. For each client type, processes all pending keyrings
   * 4. Calls addDiscoveredAccounts for each pending keyring/wallet type combination
   * 5. Updates the pending status to false after successful discovery
   * 6. Persists changes to storage after each successful discovery
   * 7. Ensures the discovery running flag is reset in finally block
   * @throws {Error} If discovery is already running
   * @returns A promise that resolves when all pending discoveries are complete
   */
  performAccountDiscovery = async (): Promise<void> => {
    // discovery is running
    if (this.discoveryRunning) throw new Error('discovery is running');
    this.discoveryRunning = true;
    try {
      for (const walletType of Object.values(WalletClientType)) {
        const clientType = walletType;
        const client = MultichainWalletSnapFactory.createClient(clientType, {
          setSelectedAccount: false,
        });
        const { discoveryScope } = WALLET_SNAP_MAP[clientType];

        for (const keyringId in this._pendingKeyring) {
          if (this._pendingKeyring[keyringId][walletType]) {
            await client.addDiscoveredAccounts(keyringId, discoveryScope);
            this._pendingKeyring[keyringId][walletType] = false;
            await StorageWrapper.setItem(
              PENDING_SRP_DISCOVERY,
              JSON.stringify(this._pendingKeyring),
            );
          }
        }
      }
    } finally {
      this.discoveryRunning = false;
    }
  };

  /**
   * Initializes the account discovery service by loading persisted state from storage.
   * This method:
   * 1. Resets the pending keyring object to an empty state
   * 2. Attempts to load previously saved discovery operations from storage
   * 3. Parses and restores the pending keyring state if valid data exists
   * 4. Sets the discovery running flag to false to ensure clean state
   * Called automatically by getInstance() when creating the singleton instance.
   * @returns A promise that resolves when initialization is complete
   */
  init = async (): Promise<void> => {
    this._pendingKeyring = {};
    const pendingString = await StorageWrapper.getItem(PENDING_SRP_DISCOVERY);
    if (pendingString) {
      const pendingKeyring = JSON.parse(pendingString);
      if (pendingKeyring) {
        this._pendingKeyring = pendingKeyring;
      }
    }

    this.discoveryRunning = false;
  };

  /**
   * Clears all pending keyring discovery operations.
   * Resets the internal pending keyring object to an empty state, effectively
   * canceling all scheduled account discovery operations. This does not affect
   * currently running discovery operations or persist the change to storage.
   * @returns void
   */
  clearPendingKeyring = () => {
    this._pendingKeyring = {};
  };

  /**
   * Adds keyring IDs to the pending keyring for account discovery.
   * This method:
   * 1. Creates entries for each keyring ID if they don't exist
   * 2. Marks the specified keyrings for discovery across the given wallet client types
   * 3. Sets the pending flag to true for each keyring/wallet type combination
   * 4. Persists the updated pending keyring state to storage immediately
   * @param keyringIds - Array of keyring IDs to add for account discovery
   * @param clientType - Array of wallet client types to enable discovery for (defaults to all wallet types)
   * @returns A promise that resolves when the pending keyrings are added and persisted to storage
   */
  addKeyringForAcccountDiscovery = async (
    keyringIds: string[],
    clientType: WalletClientType[] = Object.values(WalletClientType),
  ): Promise<void> => {
    for (const keyringId of keyringIds) {
      if (!this._pendingKeyring[keyringId]) {
        this._pendingKeyring[keyringId] = {};
      }
      for (const wtype of clientType) {
        this._pendingKeyring[keyringId][wtype] = true;
      }
    }

    await StorageWrapper.setItem(
      PENDING_SRP_DISCOVERY,
      JSON.stringify(this._pendingKeyring),
    );
  };
}
