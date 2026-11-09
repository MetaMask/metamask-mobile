import type { KeyringV2Builder } from '@metamask/keyring-controller';
import {
  isWatchOnlyKeyringV1Adapter,
  WatchOnlyKeyring,
  WatchOnlyKeyringV1Adapter,
} from '@metamask/watch-only-keyring';

/**
 * V1 builder: a `WatchOnlyKeyringV1Adapter` wrapping the V2 keyring, so the
 * vault can store it. It lacks `addAccounts` (not a full `KeyringBuilder`).
 *
 * @returns The watch-only keyring builder.
 */
export function buildWatchOnlyKeyringBuilder() {
  return Object.assign(
    () => new WatchOnlyKeyringV1Adapter(new WatchOnlyKeyring()),
    { type: WatchOnlyKeyring.type },
  );
}

/**
 * V2 builder: unwraps the V1 adapter so both entries share one instance.
 *
 * @returns The watch-only keyring V2 builder.
 */
export function buildWatchOnlyKeyringV2Builder(): KeyringV2Builder {
  return Object.assign(
    (keyring: unknown) => {
      if (!isWatchOnlyKeyringV1Adapter(keyring)) {
        throw new Error(
          'Expected WatchOnlyKeyringV1Adapter instance (that wraps a WatchOnlyKeyring)',
        );
      }

      return keyring.unwrap();
    },
    { type: WatchOnlyKeyring.type },
  );
}
