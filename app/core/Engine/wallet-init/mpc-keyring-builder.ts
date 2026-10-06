import type { HdKeyring } from '@metamask/eth-hd-keyring';
import {
  KeyringTypes,
  type KeyringControllerWithKeyringUnsafeAction,
} from '@metamask/keyring-controller';
import type { Keyring } from '@metamask/keyring-utils';
import { encodeMnemonic } from '@metamask/keyring-sdk';
import type { Messenger } from '@metamask/messenger';
import type { MpcSigningMfaControllerRequestSigningConfirmationAction } from '../controllers/mpc-signing-mfa-controller';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import type { AuthenticationControllerGetBearerTokenAction } from '../messengers/identity/authentication-controller-messenger';

const DEFAULT_MFA_CLOUD_SIGNER_URL =
  'https://mpc-service-non-enclave.dev-api.cx.metamask.io/v2';
const DEFAULT_MFA_RELAYER_URL =
  'wss://mm-sdk-relay.dev-api.cx.metamask.io/connection/websocket';

export type MpcKeyringBuilderMessenger = Messenger<
  'MpcKeyringBuilder',
  | KeyringControllerWithKeyringUnsafeAction
  | AuthenticationControllerGetBearerTokenAction
  | MpcSigningMfaControllerRequestSigningConfirmationAction
>;

type MpcKeyringConstructor = new (opts: {
  getRandomBytes: (size: number) => Uint8Array;
  dkls23Lib: unknown;
  cloudURL: string;
  relayerURL: string;
  getProfileToken: (opts?: {
    twoFactor?: boolean;
    challenge?: Uint8Array;
  }) => Promise<string>;
  getBackupEncryptionKey: () => Promise<Uint8Array>;
  webSocket?: unknown;
}) => Keyring;

function readEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

async function getBackupEncryptionKey(
  messenger: MpcKeyringBuilderMessenger,
): Promise<Uint8Array> {
  const mnemonic = (await messenger.call(
    'KeyringController:withKeyringUnsafe',
    { type: KeyringTypes.hd },
    async ({ keyring }) => {
      const phrase = (keyring as HdKeyring).mnemonic;
      if (!phrase) {
        throw new Error('Unable to get mnemonic to encrypt the MPC key share');
      }
      return encodeMnemonic(phrase);
    },
  )) as unknown as number[];

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new Uint8Array(mnemonic),
  );
  return new Uint8Array(digest);
}

async function getProfileToken(
  messenger: MpcKeyringBuilderMessenger,
  opts?: { twoFactor?: boolean; challenge?: Uint8Array },
): Promise<string> {
  if (opts?.twoFactor && opts.challenge) {
    await messenger.call('MpcSigningMfaController:requestSigningConfirmation');
  }

  const token = await messenger.call('AuthenticationController:getBearerToken');
  if (!token) {
    throw new Error('Sign in to MetaMask before enabling MFA');
  }
  return token;
}

/**
 * Build the MPC keyring using the React Native DKLS23 implementation.
 *
 * The keyring and native library are loaded lazily so ordinary wallet startup
 * does not initialize MPC native code.
 *
 * @param messenger - Messenger used for authentication, MFA, and the backup key.
 * @returns An MPC keyring builder.
 */
export function buildMpcKeyringBuilder(
  messenger: MpcKeyringBuilderMessenger,
): (() => Keyring) & { type: string } {
  const builder = (() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MPCKeyring } = require('@metamask/eth-mpc-keyring') as {
      MPCKeyring?: MpcKeyringConstructor;
    };
    if (!MPCKeyring) {
      throw new Error('MPC keyring package did not export a constructor');
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { dkls23Lib } = require('@metamask/mpc-react-native') as {
      dkls23Lib: unknown;
    };

    return new MPCKeyring({
      getRandomBytes: (size) => {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return bytes;
      },
      dkls23Lib,
      cloudURL: readEnv('MFA_CLOUD_SIGNER_URL', DEFAULT_MFA_CLOUD_SIGNER_URL),
      relayerURL: readEnv('MFA_RELAYER_URL', DEFAULT_MFA_RELAYER_URL),
      getProfileToken: (options) => getProfileToken(messenger, options),
      getBackupEncryptionKey: () => getBackupEncryptionKey(messenger),
      webSocket: globalThis.WebSocket,
    });
  }) as (() => Keyring) & { type: string };

  builder.type = ExtendedKeyringTypes.mpc;
  return builder;
}
