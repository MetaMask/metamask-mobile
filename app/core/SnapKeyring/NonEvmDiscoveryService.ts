import StorageWrapper from '../../store/storage-wrapper';
import { NON_EVM_DISCOVERY_PENDING } from '../../constants/storage';
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
    const nonEvmClientTypes = Object.values(WalletClientType);
    let discoveredAccountsCount = 0;
    let hasFailures = false;

    const discoveryPromises = nonEvmClientTypes.map(async (clientType) => {
      const client = MultichainWalletSnapFactory.createClient(clientType);
      return await client.addDiscoveredAccounts(keyringId);
    });

    const results = await Promise.allSettled(discoveryPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        discoveredAccountsCount += result.value;
      } else {
        console.warn(
          `${nonEvmClientTypes[index]} discovery failed:`,
          result.reason,
        );
        hasFailures = true;
      }
    });

    await this.handleDiscoveryFailures(hasFailures);

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

  /**
   * Handles discovery failures by setting/clearing the pending flag
   * @param hasFailures - Whether any discovery attempts failed
   */
  private static async handleDiscoveryFailures(
    hasFailures: boolean,
  ): Promise<void> {
    if (hasFailures) {
      await StorageWrapper.setItem(NON_EVM_DISCOVERY_PENDING, 'true');
    } else {
      await StorageWrapper.removeItem(NON_EVM_DISCOVERY_PENDING);
    }
  }

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  /**
   * Handles Bitcoin discovery failures by setting/clearing the pending flag
   * @param hasFailure - Whether Bitcoin discovery failed
   */
  private static async handleBitcoinDiscoveryFailure(
    hasFailure: boolean,
  ): Promise<void> {
    const BITCOIN_DISCOVERY_PENDING = `${NON_EVM_DISCOVERY_PENDING}_bitcoin`;
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
    const SOLANA_DISCOVERY_PENDING = `${NON_EVM_DISCOVERY_PENDING}_solana`;
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
    try {
      const isPending = await StorageWrapper.getItem(NON_EVM_DISCOVERY_PENDING);
      if (isPending === 'true') {
        await this.discoverAccounts(keyringId);
      }
    } catch (error) {
      console.warn('Failed to check/retry non-EVM discovery:', error);
    }
  }

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  /**
   * Checks if Bitcoin discovery is pending and retries if needed
   * @param keyringId - The keyring ID to retry discovery for
   */
  static async retryBitcoinIfPending(keyringId: string): Promise<void> {
    try {
      const BITCOIN_DISCOVERY_PENDING = `${NON_EVM_DISCOVERY_PENDING}_bitcoin`;
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
      const SOLANA_DISCOVERY_PENDING = `${NON_EVM_DISCOVERY_PENDING}_solana`;
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
