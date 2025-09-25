import { Bip44Account } from '@metamask/account-api';
import { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import { MultichainAccountWallet } from '@metamask/multichain-account-service';
import Engine from '../core/Engine';
import { trace, TraceOperation, TraceName } from '../util/trace';

/**
 * Discover and create accounts.
 *
 * This function is wrapped by {@link discoverAndCreateAccounts} to add tracing
 * and should not be called directly.
 *
 * @param entropySource - Entropy source ID to use for account discovery
 * @returns The number of discovered and created accounts.
 */
async function _discoverAndCreateAccounts(
  entropySource: EntropySourceId,
): Promise<number> {
  // HACK: Force Snap keyring instantiation.
  await Engine.getSnapKeyring();

  // NOTE: For now, we need to upcast this type, because for now it uses the
  // `MultichainAccountWallet` type from the `account-api` (which is not aligned
  // with the one coming from the service).
  // TODO: Once both types are re-aligned, we will be able to remove this type-cast.
  const wallet =
    Engine.context.MultichainAccountService.getMultichainAccountWallet({
      entropySource,
    }) as MultichainAccountWallet<Bip44Account<KeyringAccount>>;

  const result = await wallet.discoverAndCreateAccounts();

  // Compute the number of discovered accounts across all account providers.
  return Object.values(result).reduce((acc, discovered) => acc + discovered, 0);
}

/**
 * Discover and create accounts.
 *
 * @param entropySource - Entropy source ID to use for account discovery
 * @returns The number of discovered and created accounts.
 */
export async function discoverAndCreateAccounts(
  entropySource: EntropySourceId,
): Promise<number> {
  return trace(
    {
      name: TraceName.DiscoverAccounts,
      op: TraceOperation.AccountDiscover,
    },
    () => _discoverAndCreateAccounts(entropySource),
  );
}
