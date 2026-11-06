import type {
  KeyringBuilder,
  KeyringV2Builder,
} from '@metamask/keyring-controller';
import {
  isWatchOnlyKeyringV1Adapter,
  WatchOnlyKeyring,
  WatchOnlyKeyringV1Adapter,
} from '@metamask/watch-only-keyring';

/**
 * Build the V1 keyring builder for the watch-only keyring.
 *
 * The V1 entry is a `WatchOnlyKeyringV1Adapter` wrapping the V2
 * `WatchOnlyKeyring`, so the `KeyringController` can store it in the vault.
 * Registering the builder creates nothing: the keyring only enters the vault
 * when `WatchOnlyAccountService` creates the first watch-only account.
 *
 * @returns The watch-only keyring builder.
 */
export function buildWatchOnlyKeyringBuilder(): KeyringBuilder {
  // The adapter does not implement the full V1 `Keyring` contract (notably
  // `addAccounts`), like the Snap keyring V1 adapter.
  const builder = (() =>
    new WatchOnlyKeyringV1Adapter(
      new WatchOnlyKeyring(),
    )) as unknown as KeyringBuilder;

  builder.type = WatchOnlyKeyring.type;

  return builder;
}

/**
 * Build the V2 keyring builder for the watch-only keyring.
 *
 * Unwraps the `WatchOnlyKeyring` held by the V1 adapter, so the V1 and V2
 * entries share one instance (like the Snap keyring).
 *
 * @returns The watch-only keyring V2 builder.
 */
export function buildWatchOnlyKeyringV2Builder(): KeyringV2Builder {
  const builder = Object.assign(
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

  // `KeyringV2Builder` is typed against `@metamask/keyring-controller`'s
  // `KeyringV2`, which the unwrapped keyring satisfies structurally.
  return builder as unknown as KeyringV2Builder;
}
