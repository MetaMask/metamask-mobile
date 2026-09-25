import { isValidHexAddress, type Hex } from '@metamask/utils';
import Engine from '../Engine';
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
  const keyring = Engine.context.KeyringController.state.keyrings.find(
    ({ type }) => type === WatchOnlyKeyring.type,
  );
  return (keyring?.accounts ?? []) as Hex[];
}

/**
 * Remove every watch-only account. The KeyringController drops the emptied
 * keyring, and the AccountsController falls back to the most recently
 * selected real account.
 */
async function stop(): Promise<WatchOnlySessionStatus> {
  assertAvailable();
  for (const address of getWatchedAddresses()) {
    await Engine.context.KeyringController.removeAccount(address);
  }
  return getStatus();
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
  await stop();
  await Engine.context.KeyringController.addNewKeyring(WatchOnlyKeyring.type, {
    addresses: [address],
  });
  Engine.setSelectedAddress(address);
  return getStatus();
}

function getStatus(): WatchOnlySessionStatus {
  const [address = null] = getWatchedAddresses();
  return { active: address !== null, address };
}

export const WatchOnlySession = { start, stop, getStatus };
