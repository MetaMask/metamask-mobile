import StorageWrapper from '../../store/storage-wrapper';
import {
  BITCOIN_DISCOVERY_PENDING,
  SOLANA_DISCOVERY_PENDING,
} from '../../constants/storage';
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from './MultichainWalletSnapClient';

/**
 * Service for handling non-EVM account discovery across the app
 */
export class NonEvmDiscoveryService {
  /**
   * Attempts to discover non-EVM accounts for a given keyring
   * @param keyringId - The keyring ID to discover accounts for
   * @returns Promise<number> - Number of discovered accounts
   */
  static async discoverAccounts(keyringId: string): Promise<number> {
    let discoveredAccountsCount = 0;

    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    try {
      const bitcoinAccounts = await this.discoverBitcoinAccounts(keyringId);
      discoveredAccountsCount += bitcoinAccounts;
    } catch (error) {
      console.warn('Bitcoin discovery failed:', error);
    }
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    try {
      const solanaAccounts = await this.discoverSolanaAccounts(keyringId);
      discoveredAccountsCount += solanaAccounts;
    } catch (error) {
      console.warn('Solana discovery failed:', error);
    }
    ///: END:ONLY_INCLUDE_IF

    return discoveredAccountsCount;
  }

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  /**
   * Attempts to discover Bitcoin accounts for a given keyring
   * @param keyringId - The keyring ID to discover accounts for
   * @returns Promise<number> - Number of discovered accounts
   */
  static async discoverBitcoinAccounts(keyringId: string): Promise<number> {
    try {
      const client = MultichainWalletSnapFactory.createClient(
        WalletClientType.Bitcoin,
      );
      const discoveredAccounts = await client.addDiscoveredAccounts(keyringId);
      await this.handleBitcoinDiscoveryFailure(false);
      return discoveredAccounts;
    } catch (error) {
      console.warn('Bitcoin discovery failed:', error);
      await this.handleBitcoinDiscoveryFailure(true);
      return 0;
    }
  }
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  /**
   * Attempts to discover Solana accounts for a given keyring
   * @param keyringId - The keyring ID to discover accounts for
   * @returns Promise<number> - Number of discovered accounts
   */
  static async discoverSolanaAccounts(keyringId: string): Promise<number> {
    try {
      const client = MultichainWalletSnapFactory.createClient(
        WalletClientType.Solana,
      );
      const discoveredAccounts = await client.addDiscoveredAccounts(keyringId);
      await this.handleSolanaDiscoveryFailure(false);
      return discoveredAccounts;
    } catch (error) {
      console.warn('Solana discovery failed:', error);
      await this.handleSolanaDiscoveryFailure(true);
      return 0;
    }
  }
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  /**
   * Handles Bitcoin discovery failures by setting/clearing the pending flag
   * @param hasFailure - Whether Bitcoin discovery failed
   */
  private static async handleBitcoinDiscoveryFailure(
    hasFailure: boolean,
  ): Promise<void> {
    if (hasFailure) {
      await StorageWrapper.setItem(BITCOIN_DISCOVERY_PENDING, 'true');
    } else {
      await StorageWrapper.removeItem(BITCOIN_DISCOVERY_PENDING);
    }
  }
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  /**
   * Handles Solana discovery failures by setting/clearing the pending flag
   * @param hasFailure - Whether Solana discovery failed
   */
  private static async handleSolanaDiscoveryFailure(
    hasFailure: boolean,
  ): Promise<void> {
    if (hasFailure) {
      await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');
    } else {
      await StorageWrapper.removeItem(SOLANA_DISCOVERY_PENDING);
    }
  }
  ///: END:ONLY_INCLUDE_IF

  /**
   * Checks if non-EVM discovery is pending and retries if needed
   * @param keyringId - The keyring ID to retry discovery for
   */
  static async retryIfPending(keyringId: string): Promise<void> {
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    try {
      await this.retryBitcoinIfPending(keyringId);
    } catch (error) {
      console.warn('Failed to retry Bitcoin discovery:', error);
    }
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    try {
      await this.retrySolanaIfPending(keyringId);
    } catch (error) {
      console.warn('Failed to retry Solana discovery:', error);
    }
    ///: END:ONLY_INCLUDE_IF
  }

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  /**
   * Checks if Bitcoin discovery is pending and retries if needed
   * @param keyringId - The keyring ID to retry discovery for
   */
  static async retryBitcoinIfPending(keyringId: string): Promise<void> {
    try {
      const isPending = await StorageWrapper.getItem(BITCOIN_DISCOVERY_PENDING);
      if (isPending === 'true') {
        await this.discoverBitcoinAccounts(keyringId);
      }
    } catch (error) {
      console.warn('Failed to check/retry Bitcoin discovery:', error);
    }
  }
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  /**
   * Checks if Solana discovery is pending and retries if needed
   * @param keyringId - The keyring ID to retry discovery for
   */
  static async retrySolanaIfPending(keyringId: string): Promise<void> {
    try {
      const isPending = await StorageWrapper.getItem(SOLANA_DISCOVERY_PENDING);
      if (isPending === 'true') {
        await this.discoverSolanaAccounts(keyringId);
      }
    } catch (error) {
      console.warn('Failed to check/retry Solana discovery:', error);
    }
  }
  ///: END:ONLY_INCLUDE_IF
}
