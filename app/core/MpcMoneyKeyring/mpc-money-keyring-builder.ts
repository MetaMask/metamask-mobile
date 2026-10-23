import type {
  KeyringBuilder,
  KeyringV2Builder,
} from '@metamask/keyring-controller';
import {
  MpcMoneyKeyring as MpcMoneyKeyringV2,
  type MpcMoneyKeyringOptions,
} from '@metamask/eth-money-mpc-keyring/v2';
import { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import { sha256 } from '@noble/hashes/sha2';
import { MpcMoneyKeyring } from './MpcMoneyKeyring';
import { applyEmptyIkmHkdfWorkaround } from './empty-ikm-hkdf-workaround';

// Only dev is deployed so far.
const MPC_CLOUD_URL =
  process.env.MM_MONEY_MPC_CLOUD_URL ||
  'https://mpc-service.dev-api.cx.metamask.io/v2';
const MPC_RELAYER_URL =
  process.env.MM_MONEY_MPC_RELAYER_URL ||
  'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket';

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

export interface RealMpcMoneyKeyringBuilderOptions {
  /** Returns the profile access token used for the MPC service. */
  getBearerToken: () => Promise<string>;
}

const getProfileId = (token: string): string =>
  (
    JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8')) as {
      sub: string;
    }
  ).sub;

/**
 * Build the V1 keyring builder for the real Money MPC keyring, backed by the
 * DKLS23/CL24 libraries from `@metamask/mpc-react-native` and the MPC service.
 *
 * The profile bearer token is used as the profile token: the dev MPC service
 * does not enforce the 2FA claims yet. The backup encryption key is a
 * placeholder derived from the profile id until its source is decided.
 *
 * @param options - Builder options.
 * @param options.getBearerToken - Returns the profile access token.
 * @returns The real Money MPC keyring builder.
 */
export function buildRealMpcMoneyKeyringBuilder({
  getBearerToken,
}: RealMpcMoneyKeyringBuilderOptions): KeyringBuilder {
  applyEmptyIkmHkdfWorkaround();

  const builder: KeyringBuilder = () => {
    // Loaded lazily so builds without the real keyring never load the native
    // module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cl24Lib, dkls23Lib } = require('@metamask/mpc-react-native');
    return new RealMpcMoneyKeyring({
      cl24Lib,
      dkls23Lib,
      cloudURL: MPC_CLOUD_URL,
      relayerURL: MPC_RELAYER_URL,
      getProfileToken: () => getBearerToken(),
      // TODO: replace the placeholder once the backup key source is decided.
      getBackupEncryptionKey: async () =>
        sha256(
          new TextEncoder().encode(
            `mm-mobile-dev-backup:${getProfileId(await getBearerToken())}`,
          ),
        ),
      webSocket: WebSocket,
    });
  };

  builder.type = RealMpcMoneyKeyring.type;

  return builder;
}
