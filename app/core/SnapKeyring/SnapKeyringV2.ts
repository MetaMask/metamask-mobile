import {
  SnapKeyring as SnapKeyringV2,
  SnapKeyringV1Adapter,
} from '@metamask/eth-snap-keyring/v2';
import { KeyringType } from '@metamask/keyring-api/v2';
import type { KeyringAccount } from '@metamask/keyring-api';
import type {
  KeyringBuilder,
  KeyringV2Builder,
} from '@metamask/keyring-controller';
import type { Keyring } from '@metamask/keyring-utils';
import { assert } from '@metamask/utils';
import { SnapKeyringImpl } from './SnapKeyring';
import type { SnapKeyringBuilderMessenger } from './types';
import { hasTestOverrides } from '../../util/test/utils';

/**
 * The v2 messenger has the same scope as the v1 messenger, so we reuse the
 * existing type.
 */
export type SnapKeyringV2BuilderMessenger = SnapKeyringBuilderMessenger;

export class SnapKeyringV2Impl extends SnapKeyringImpl {
  async assertAccountCanBeUsed(_account: KeyringAccount) {
    // No-op because the v2 keyring relies on proper use of `withKeyringV2`,
    // which makes sure the account can be used (e.g. unique addresses,
    // unique account IDs).
  }
}

/**
 * Constructs a v2 SnapKeyring builder with specified handlers for managing
 * Snap accounts.
 *
 * @param messenger - The messenger instance.
 * @param helpers - Helpers required by the v2 Snap keyring implementation.
 * @returns A v2 Snap keyring builder.
 */
export function snapKeyringV2AdaptedAsV1Builder(
  messenger: SnapKeyringV2BuilderMessenger,
): KeyringBuilder {
  const SnapKeyringV2AdaptedAsV1BuilderV2 = () => {
    const v2 = new SnapKeyringV2({
      messenger,
      callbacks: new SnapKeyringV2Impl(messenger),
      // Enables generic account creation for new chain integration. We keep
      // it on under e2e to match the v1 keyring's behaviour in this codebase.
      isAnyAccountTypeAllowed: hasTestOverrides,
    });

    // NOTE: This adapter cannot really be used as a true v1 keyring; here it
    // only satisfies the type requirements of the existing KeyringController
    // so the standard keyring lifecycles still work. It MUST NOT be used
    // with the other v1 methods.
    return new SnapKeyringV1Adapter(v2) as unknown as Keyring;
  };
  SnapKeyringV2AdaptedAsV1BuilderV2.type = KeyringType.Snap;

  return SnapKeyringV2AdaptedAsV1BuilderV2;
}

/**
 * Constructs a v2 SnapKeyring builder with specified handlers for managing
 * Snap accounts.
 *
 * @param helpers - Helpers required by the v2 Snap keyring implementation.
 * @returns A v2 Snap keyring builder.
 */
export function snapKeyringV2Builder(): KeyringV2Builder {
  const SnapKeyringV2Builder = (keyring: Keyring) => {
    assert(
      keyring instanceof SnapKeyringV1Adapter,
      'Expected KeyringV1Adapter instance (that wraps a SnapKeyringV2)',
    );

    // Retrieve the original v2 reference from the adapter so both v1 and v2
    // builders share the same underlying SnapKeyringV2 instance.
    return (keyring as SnapKeyringV1Adapter).unwrap() as SnapKeyringV2;
  };
  SnapKeyringV2Builder.type = KeyringType.Snap;

  return SnapKeyringV2Builder;
}
