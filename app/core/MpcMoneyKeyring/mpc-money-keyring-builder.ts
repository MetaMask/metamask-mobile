import type {
  KeyringBuilder,
  KeyringV2Builder,
} from '@metamask/keyring-controller';
import {
  MpcMoneyKeyring as MpcMoneyKeyringV2,
  type MpcMoneyKeyringOptions,
} from '@metamask/eth-money-mpc-keyring/v2';
import { MpcMoneyKeyring } from './MpcMoneyKeyring';

/**
 * Build the V1 keyring builder for the Money MPC keyring stub.
 *
 * The real V1 `MpcMoneyKeyring` from `@metamask/eth-money-mpc-keyring` requires
 * the DKLS23/CL24 WebAssembly libraries and live MPC service endpoints, which
 * mobile is not ready to adopt; the local stub stands in with the same keyring
 * type. When mobile adopts the real V1 keyring this builder will construct it
 * instead.
 *
 * Registration is fenced behind the `MM_MONEY_MPC_KEYRING_ENABLED`
 * compile-time gate rather than unconditional like the Money builder. That is
 * safe only while no released build can hold a Money MPC keyring in its vault,
 * because the controller needs the builder to recognize the type while
 * deserializing the vault. Once any released build can hold one, the fence
 * must be removed.
 *
 * @returns The Money MPC keyring builder.
 */
export function buildMpcMoneyKeyringBuilder(): KeyringBuilder {
  const builder: KeyringBuilder = () => new MpcMoneyKeyring();

  builder.type = MpcMoneyKeyring.type;

  return builder;
}

/**
 * Build the V2 keyring builder for the Money MPC keyring.
 *
 * The V2 adapter comes from `@metamask/eth-money-mpc-keyring/v2` and wraps the
 * legacy keyring passed by the controller (no `entropySource`: the Money MPC
 * keyring has no entropy source of its own). The controller dispatches V2
 * builders by matching against the inner keyring's `type`, so `builder.type`
 * must equal `MpcMoneyKeyring.type`.
 *
 * @returns The Money MPC keyring V2 builder.
 */
export function buildMpcMoneyKeyringV2Builder(): KeyringV2Builder {
  const builder: KeyringV2Builder = Object.assign(
    (keyring: unknown) =>
      new MpcMoneyKeyringV2({
        legacyKeyring: keyring as MpcMoneyKeyringOptions['legacyKeyring'],
      }),
    { type: MpcMoneyKeyring.type },
  );

  return builder;
}
