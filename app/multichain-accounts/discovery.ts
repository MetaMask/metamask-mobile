import { Bip44Account } from '@metamask/account-api';
import { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import { MultichainAccountWallet } from '@metamask/multichain-account-service';
import Engine from '../core/Engine';
import { endTrace, trace, TraceOperation, TraceName } from '../util/trace';

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
 * A trace is only emitted when discovery actually created accounts. The common
 * no-op login discovery (which fires on every login, per entropy source, but
 * creates nothing) is intentionally not traced to avoid disproportionate span
 * volume. The emitted span still covers the full discovery duration via a
 * backdated start time, so timing for meaningful runs is unchanged.
 *
 * @param entropySource - Entropy source ID to use for account discovery
 * @returns The number of discovered and created accounts.
 */
export async function discoverAccounts(
  entropySource: EntropySourceId,
): Promise<number> {
  // Capture the start up-front (same instant the callback trace form would have
  // stamped) so we can backdate the span if discovery turns out to do real work.
  const startTime = Date.now();

  const discovered = await _discoverAccounts(entropySource);

  if (discovered > 0) {
    trace({
      name: TraceName.DiscoverAccounts,
      op: TraceOperation.AccountDiscover,
      startTime,
    });
    endTrace({
      name: TraceName.DiscoverAccounts,
      data: { discovered },
    });
  }

  return discovered;
}
