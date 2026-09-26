import { isValidHexAddress, type Hex } from '@metamask/utils';
import Engine from '../Engine';
import { removeAccountsFromPermissions } from '../Permissions';
import { WatchOnlyKeyring } from './WatchOnlyKeyring';

export interface WatchOnlySessionStatus {
  active: boolean;
  address: Hex | null;
}

function assertAvailable(): void {
  if (!__DEV__) {
    throw new Error('Watch-only sessions are only available in development');
  }
}

function getWatchedAddresses(): Hex[] {
  return Engine.context.KeyringController.state.keyrings
    .filter(({ type }) => type === WatchOnlyKeyring.type)
    .flatMap(({ accounts }) => accounts) as Hex[];
}

// Session mutations run one at a time: overlapping start() calls would
// otherwise each clear the old session and then each add a keyring.
let pendingMutation: Promise<unknown> = Promise.resolve();

function serialize<Result>(mutation: () => Promise<Result>): Promise<Result> {
  const run = pendingMutation.then(mutation, mutation);
  pendingMutation = run.catch(() => undefined);
  return run;
}

async function removeWatchedAccounts(): Promise<void> {
  const addresses = getWatchedAddresses();
  if (addresses.length === 0) {
    return;
  }
  // Like Engine.removeAccount: revoke dapp permissions first, so no
  // connection to a watched address outlives the session.
  removeAccountsFromPermissions(addresses);
  for (const address of addresses) {
    await Engine.context.KeyringController.removeAccount(address);
  }
}

/**
 * Remove every watch-only account. The KeyringController drops the emptied
 * keyring, and the AccountsController falls back to the most recently
 * selected real account.
 */
async function stop(): Promise<WatchOnlySessionStatus> {
  assertAvailable();
  return serialize(async () => {
    await removeWatchedAccounts();
    return getStatus();
  });
}

/**
 * Replace any active watch-only account with `address` and select it.
 *
 * @param address - EVM address to browse read-only.
 */
async function start(address: string): Promise<WatchOnlySessionStatus> {
  assertAvailable();
  if (!isValidHexAddress(address as Hex)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  return serialize(async () => {
    await removeWatchedAccounts();
    await Engine.context.KeyringController.addNewKeyring(
      WatchOnlyKeyring.type,
      { addresses: [address] },
    );
    Engine.setSelectedAddress(address);
    return getStatus();
  });
}

function getStatus(): WatchOnlySessionStatus {
  const [address = null] = getWatchedAddresses();
  return { active: address !== null, address };
}

export const WatchOnlySession = { start, stop, getStatus };
