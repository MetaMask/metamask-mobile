import { Bip44Account } from '@metamask/account-api';
import { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import { MultichainAccountWallet } from '@metamask/multichain-account-service';
import Engine from '../core/Engine';
import { trace, TraceOperation, TraceName } from '../util/trace';
import { retryWithExponentialDelay } from '../util/exponential-retry';

/**
 * Discover and create accounts.
 *
 * This function is wrapped by {@link discoverAccounts} to add tracing
 * and should not be called directly.
 *
 * @param entropySource - Entropy source ID to use for account discovery
 * @returns The number of discovered and created accounts.
 */
async function _discoverAccounts(
  entropySource: EntropySourceId,
): Promise<number> {
  // HACK: Force Snap keyring instantiation.
  await Engine.getSnapKeyring?.();

  // Ensure the account tree is synced with user storage before discovering accounts.
  await Engine.context.AccountTreeController.syncWithUserStorageAtLeastOnce();

  // NOTE: For now, we need to upcast this type, because for now it uses the
  // `MultichainAccountWallet` type from the `account-api` (which is not aligned
  // with the one coming from the service).
  // TODO: Once both types are re-aligned, we will be able to remove this type-cast.
  const wallet =
    Engine.context.MultichainAccountService.getMultichainAccountWallet({
      entropySource,
    }) as MultichainAccountWallet<Bip44Account<KeyringAccount>>;

  const result = await wallet.discoverAccounts();

  // Return the number of discovered accounts across all account providers.
  return result.length;
}

/**
 * Discover and create accounts.
 *
 * @param entropySource - Entropy source ID to use for account discovery
 * @returns The number of discovered and created accounts.
 */
export async function discoverAccounts(
  entropySource: EntropySourceId,
): Promise<number> {
  return trace(
    {
      name: TraceName.DiscoverAccounts,
      op: TraceOperation.AccountDiscover,
    },
    () => _discoverAccounts(entropySource),
  );
}

/**
 * This method gets the primary entropy source ID. It assumes it's always being defined, which means, vault
 * creation must have been executed beforehand.
 * @returns Primary entropy source ID (similar to keyring ID).
 */
const getPrimaryEntropySourceId = (): EntropySourceId =>
  Engine.context.KeyringController.state.keyrings[0].metadata.id;

/**
 * Attempts to discover accounts with retries and exponential backoff.
 * @param entropySource - Optional entropy source ID to use for account discovery. If not provided, the primary entropy source ID will be used.
 */
export const attemptMultichainAccountWalletDiscovery = async (
  entropySource?: EntropySourceId,
): Promise<number> =>
  await retryWithExponentialDelay(
    async (): Promise<number> =>
      await discoverAccounts(entropySource ?? getPrimaryEntropySourceId()),
    3, // maxRetries
    1000, // baseDelay
    10000, // maxDelay
  );
