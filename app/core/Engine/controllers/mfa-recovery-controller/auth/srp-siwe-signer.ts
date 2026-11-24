import { SLIP10Node } from '@metamask/key-tree';
import { personalSign } from '@metamask/eth-sig-util';
import {
  selectPrimaryHdKeyringEntropySourceId,
  type KeyringControllerGetStateAction,
  type KeyringControllerState,
  type KeyringControllerWithKeyringV2UnsafeAction,
} from '@metamask/keyring-controller';
import type {
  ActionConstraint,
  EventConstraint,
  Messenger,
} from '@metamask/messenger';
import {
  assert,
  bytesToHex,
  concatBytes,
  createDataView,
  hexToBytes,
  stringToBytes,
} from '@metamask/utils';
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { MfaRecoveryControllerError } from '../errors';

/**
 * SIP-6 input and salt the profile sign-in key uses
 * (`@metamask/profile-sync-controller` message signing), so SIWE proofs are
 * signed by the same key.
 */
const MESSAGE_SIGNING_SNAP_ID = 'npm:@metamask/message-signing-snap';
const MESSAGE_SIGNING_SALT = '';

/** `@metamask/snaps-utils` `SIP_6_MAGIC_VALUE` (`0xd36e6170 - 0x80000000`). */
const SIP_6_MAGIC_VALUE = `1399742832'`;
const HARDENED_VALUE = 0x80000000;

function getDerivationPathArray(hash: Uint8Array): `bip32:${number}'`[] {
  const view = createDataView(hash);
  const path: `bip32:${number}'`[] = [];
  for (let index = 0; index < 8; index++) {
    // eslint-disable-next-line no-bitwise
    const pathIndex = (view.getUint32(index * 4) | HARDENED_VALUE) >>> 0;
    path.push(`bip32:${pathIndex - HARDENED_VALUE}'`);
  }
  return path;
}

/**
 * Derives the primary SRP's message-signing private key with SIP-6, as
 * profile sign-in does.
 *
 * @param seed - BIP-39 seed of the primary HD keyring.
 * @returns The 32-byte private key. The caller must zero it after use.
 */
export async function deriveSrpMessageSigningKey(
  seed: Uint8Array,
): Promise<Uint8Array> {
  const hash = keccak256(
    concatBytes([
      stringToBytes(MESSAGE_SIGNING_SNAP_ID),
      keccak256(stringToBytes(MESSAGE_SIGNING_SALT)),
    ]),
  );
  const { privateKey } = await SLIP10Node.fromSeed({
    derivationPath: [
      seed,
      `bip32:${SIP_6_MAGIC_VALUE}`,
      ...getDerivationPathArray(hash),
    ],
    curve: 'secp256k1',
  });
  assert(privateKey, 'Failed to derive SIP-6 entropy.');
  return hexToBytes(privateKey);
}

function toAddress(privateKey: Uint8Array): string {
  const publicKey = secp256k1.getPublicKey(privateKey, false);
  return bytesToHex(keccak256(publicKey.slice(1)).slice(-20));
}

/** Signs SIWE proofs with the primary SRP's message-signing key. */
export interface SiweSigner {
  /** The lowercase address of the signing key. */
  getAddress: () => Promise<string>;
  /** EIP-191 `personal_sign` of `message`. */
  signMessage: (message: string) => Promise<string>;
}

/**
 * Creates a SIWE signer over the primary SRP's message-signing key. The seed
 * and key are read per call and zeroed after use.
 *
 * @param options - Options.
 * @param options.getSeed - Returns a copy of the primary HD keyring seed.
 * @returns The signer.
 */
export function createSrpSiweSigner({
  getSeed,
}: {
  getSeed: () => Promise<Uint8Array>;
}): SiweSigner {
  const withPrivateKey = async <Result>(
    callback: (privateKey: Uint8Array) => Result,
  ): Promise<Result> => {
    const seed = await getSeed();
    let privateKey: Uint8Array | undefined;
    try {
      privateKey = await deriveSrpMessageSigningKey(seed);
      return callback(privateKey);
    } finally {
      seed.fill(0);
      privateKey?.fill(0);
    }
  };

  return {
    getAddress: async () => withPrivateKey(toAddress),
    signMessage: async (message) =>
      withPrivateKey((privateKey) => {
        const keyBuffer = Buffer.from(privateKey);
        try {
          return personalSign({
            privateKey: keyBuffer,
            data: bytesToHex(stringToBytes(message)),
          });
        } finally {
          keyBuffer.fill(0);
        }
      }),
  };
}

/** The `KeyringController` messenger actions {@link getPrimarySrpSeed} reads. */
export interface PrimarySrpKeyring {
  /** `KeyringController:getState`. */
  getState: () => KeyringControllerState;
  /** `KeyringController:withKeyringV2Unsafe`. */
  withKeyringV2Unsafe: (
    selector: { id: string },
    operation: (args: { keyring: unknown }) => Promise<Uint8Array | undefined>,
  ) => Promise<unknown>;
}

/**
 * Reads a copy of the primary HD keyring's seed.
 *
 * @param keyring - The keyring actions.
 * @returns A copy of the seed. The caller must zero it after use.
 * @throws {MfaRecoveryControllerError} When locked or without an HD keyring.
 */
export async function getPrimarySrpSeed(
  keyring: PrimarySrpKeyring,
): Promise<Uint8Array> {
  const state = keyring.getState();
  const id = state.isUnlocked
    ? selectPrimaryHdKeyringEntropySourceId(state)
    : undefined;
  // The messenger erases the action's generic callback result.
  const seed = id
    ? await keyring.withKeyringV2Unsafe({ id }, async ({ keyring: hd }) => {
        const keyringSeed = (hd as { seed?: Uint8Array | null }).seed;
        return keyringSeed ? new Uint8Array(keyringSeed) : undefined;
      })
    : undefined;
  if (!(seed instanceof Uint8Array)) {
    throw new MfaRecoveryControllerError(
      'The primary SRP is unavailable',
      'primary_account_unavailable',
    );
  }
  return seed;
}

type SrpKeyringAction =
  | KeyringControllerGetStateAction
  | KeyringControllerWithKeyringV2UnsafeAction;

type SrpKeyringCall = Pick<
  Messenger<string, SrpKeyringAction, never>,
  'call'
>['call'];

/**
 * Creates a {@link SiweSigner} backed by a messenger that can call
 * `KeyringController:getState` and `KeyringController:withKeyringV2Unsafe`.
 */
export function createSrpSiweSignerFromMessenger<
  Namespace extends string,
  Actions extends ActionConstraint,
  Events extends EventConstraint,
>(
  messenger: Messenger<Namespace, Actions, Events> &
    (SrpKeyringAction extends Actions ? unknown : never),
): SiweSigner {
  const call = messenger.call.bind(messenger) as unknown as SrpKeyringCall;
  return createSrpSiweSigner({
    getSeed: async () =>
      await getPrimarySrpSeed({
        getState: () => call('KeyringController:getState'),
        withKeyringV2Unsafe: async (selector, operation) =>
          await call(
            'KeyringController:withKeyringV2Unsafe',
            selector,
            operation,
          ),
      }),
  });
}
