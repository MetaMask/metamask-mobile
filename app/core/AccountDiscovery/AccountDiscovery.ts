import {
  MultichainWalletSnapFactory,
  WALLET_SNAP_MAP,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';
import StorageWrapper from '../../store/storage-wrapper';
import { PENDING_SRP_DISCOVERY } from '../../constants/storage';

/**
 * Interface for tracking pending account discovery operations.
 * Maps keyring IDs to wallet types and their discovery status.
 */
interface AccountDiscoverySRP {
  [keyringId: string]: {
    [walletType: string]: boolean;
  };
}

/**
 * Service for managing account discovery operations across different wallet types.
 * Handles the discovery of accounts for multiple keyring IDs and wallet client types,
 * maintaining state persistence through storage.
 */
class AccountDiscoveryService {
  private _pendingKeyring: AccountDiscoverySRP = {};
  private discoveryRunning = false;

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

  /**
   * Attempts to perform account discovery for all pending keyring operations.
   * This is a wrapper method that calls performAccountDiscovery.
   * @throws {Error} If discovery is already running
   */
  attemptAccountDiscovery = async (): Promise<void> => {
    await this.performAccountDiscovery();
  };

  /**
   * Performs account discovery for all pending keyring operations across all wallet types.
   * Iterates through all wallet client types and pending keyrings to discover accounts.
   * Updates the pending status and persists changes to storage after each successful discovery.
   * @throws {Error} If discovery is already running
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
   * Creates a new AccountDiscoveryService instance and initializes it.
   * Automatically calls the init method to load persisted state.
   */
  constructor() {
    this.init();
  }

  /**
   * Initializes the account discovery service by loading persisted state from storage.
   * Resets the pending keyring object and loads any previously saved discovery operations.
   * Sets the discovery running flag to false.
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
   * Resets the internal pending keyring object to an empty state.
   */
  clearPendingKeyring = () => {
    this._pendingKeyring = {};
  };

  /**
   * Adds keyring IDs to the pending keyring for account discovery.
   * Marks the specified keyrings for discovery across the given wallet client types.
   * Persists the updated pending keyring state to storage.
   * @param keyringIds - Array of keyring IDs to add for account discovery
   * @param clientType - Array of wallet client types to enable discovery for (defaults to all wallet types)
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

/**
 * Singleton instance of the AccountDiscoveryService.
 * Provides a global service for managing account discovery operations
 * across different wallet types and keyring IDs.
 */
export const AccountDiscovery = new AccountDiscoveryService();
