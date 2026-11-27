import { mnemonicToSeed } from '@metamask/key-tree';
import { personalSign, recoverPersonalSignature } from '@metamask/eth-sig-util';
import type { KeyringControllerState } from '@metamask/keyring-controller';
import { bytesToHex, hexToBytes, stringToBytes } from '@metamask/utils';
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
// Not in the package `exports` map; imported by path to compare against the
// key profile sign-in derives.
import { getMessageSigningPublicKey } from '../../../../../../node_modules/@metamask/profile-sync-controller/dist/shared/utils/message-signing';
import { MfaRecoveryControllerError } from '../errors';
import {
  createSrpSiweSigner,
  deriveSrpMessageSigningKey,
  getPrimarySrpSeed,
  type PrimarySrpKeyring,
} from './srp-siwe-signer';

jest.mock('@metamask/eth-sig-util', () => {
  const actual = jest.requireActual('@metamask/eth-sig-util');
  return {
    ...actual,
    personalSign: jest.fn(actual.personalSign),
  };
});

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';
const ENTROPY_SOURCE_ID = 'primary-hd-keyring-id';
const HD_KEYRING_TYPE = 'HD Key Tree';
const SIMPLE_KEYRING_TYPE = 'Simple Key Pair';

let testSeed: Uint8Array;

beforeAll(async () => {
  testSeed = await mnemonicToSeed(TEST_MNEMONIC);
});

function publicKeyToAddress(publicKey: Uint8Array): string {
  return bytesToHex(keccak256(publicKey.slice(1)).slice(-20));
}

function expectZeroed(bytes: Uint8Array): void {
  expect(bytes.length).toBeGreaterThan(0);
  expect(bytes.every((byte) => byte === 0)).toBe(true);
}

function createSeedGetter(seed: Uint8Array = testSeed): {
  getSeed: jest.Mock<Promise<Uint8Array>, []>;
  issuedSeeds: Uint8Array[];
} {
  const issuedSeeds: Uint8Array[] = [];
  const getSeed = jest.fn(async () => {
    const copy = new Uint8Array(seed);
    issuedSeeds.push(copy);
    return copy;
  });
  return { getSeed, issuedSeeds };
}

function createKeyringState(
  overrides: Partial<KeyringControllerState> = {},
): KeyringControllerState {
  return {
    isUnlocked: true,
    keyrings: [
      {
        type: HD_KEYRING_TYPE,
        accounts: ['0x1111111111111111111111111111111111111111'],
        metadata: { id: ENTROPY_SOURCE_ID, name: '' },
      },
    ],
    ...overrides,
  };
}

function createPrimarySrpKeyring({
  state = createKeyringState(),
  keyring = { seed: testSeed },
}: {
  state?: KeyringControllerState;
  keyring?: unknown;
} = {}): {
  primarySrpKeyring: PrimarySrpKeyring;
  withKeyringV2Unsafe: jest.Mock<
    ReturnType<PrimarySrpKeyring['withKeyringV2Unsafe']>,
    Parameters<PrimarySrpKeyring['withKeyringV2Unsafe']>
  >;
} {
  const withKeyringV2Unsafe = jest.fn<
    ReturnType<PrimarySrpKeyring['withKeyringV2Unsafe']>,
    Parameters<PrimarySrpKeyring['withKeyringV2Unsafe']>
  >(async (_selector, operation) => await operation({ keyring }));
  const primarySrpKeyring: PrimarySrpKeyring = {
    getState: () => state,
    withKeyringV2Unsafe,
  };
  return { primarySrpKeyring, withKeyringV2Unsafe };
}

describe('deriveSrpMessageSigningKey', () => {
  it('derives the same key as profile sign-in message signing', async () => {
    const expectedPublicKey = await getMessageSigningPublicKey(testSeed);

    const privateKey = await deriveSrpMessageSigningKey(testSeed);

    expect(bytesToHex(secp256k1.getPublicKey(privateKey))).toBe(
      expectedPublicKey,
    );
  });

  it('derives a 32-byte private key deterministically', async () => {
    const first = await deriveSrpMessageSigningKey(testSeed);

    const second = await deriveSrpMessageSigningKey(testSeed);

    expect(first).toHaveLength(32);
    expect(bytesToHex(second)).toBe(bytesToHex(first));
  });
});

describe('createSrpSiweSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAddress', () => {
    it('returns the address of the derived message-signing public key', async () => {
      const compressedPublicKey = hexToBytes(
        await getMessageSigningPublicKey(testSeed),
      );
      const uncompressedPublicKey =
        secp256k1.Point.fromHex(compressedPublicKey).toBytes(false);
      const { getSeed } = createSeedGetter();
      const signer = createSrpSiweSigner({ getSeed });

      const address = await signer.getAddress();

      expect(address).toBe(publicKeyToAddress(uncompressedPublicKey));
      expect(address).toMatch(/^0x[0-9a-f]{40}$/u);
    });

    it('zeroes the seed after use', async () => {
      const { getSeed, issuedSeeds } = createSeedGetter();
      const signer = createSrpSiweSigner({ getSeed });

      await signer.getAddress();

      expect(issuedSeeds).toHaveLength(1);
      expectZeroed(issuedSeeds[0]);
    });

    it('reads a fresh seed on every call', async () => {
      const { getSeed } = createSeedGetter();
      const signer = createSrpSiweSigner({ getSeed });

      const first = await signer.getAddress();
      const second = await signer.getAddress();

      expect(getSeed).toHaveBeenCalledTimes(2);
      expect(second).toBe(first);
    });
  });

  describe('signMessage', () => {
    it('produces a personal_sign signature recoverable to getAddress', async () => {
      const message = 'metamask.io wants you to sign in\n\nNonce: 0xabc';
      const { getSeed } = createSeedGetter();
      const signer = createSrpSiweSigner({ getSeed });
      const address = await signer.getAddress();

      const signature = await signer.signMessage(message);

      const recovered = recoverPersonalSignature({
        data: bytesToHex(stringToBytes(message)),
        signature,
      });
      expect(recovered.toLowerCase()).toBe(address.toLowerCase());
    });

    it('zeroes the seed after use', async () => {
      const { getSeed, issuedSeeds } = createSeedGetter();
      const signer = createSrpSiweSigner({ getSeed });

      await signer.signMessage('hello');

      expect(issuedSeeds).toHaveLength(1);
      expectZeroed(issuedSeeds[0]);
    });

    it('zeroes the seed and the signing key when signing throws', async () => {
      const signingKeys: Uint8Array[] = [];
      jest.mocked(personalSign).mockImplementationOnce(({ privateKey }) => {
        signingKeys.push(privateKey);
        throw new Error('signing failed');
      });
      const { getSeed, issuedSeeds } = createSeedGetter();
      const signer = createSrpSiweSigner({ getSeed });

      await expect(signer.signMessage('hello')).rejects.toThrow(
        'signing failed',
      );

      expectZeroed(issuedSeeds[0]);
      expect(signingKeys).toHaveLength(1);
      expectZeroed(signingKeys[0]);
    });

    it('zeroes the seed when key derivation throws', async () => {
      const { getSeed, issuedSeeds } = createSeedGetter(
        new Uint8Array([1, 2, 3, 4]),
      );
      const signer = createSrpSiweSigner({ getSeed });

      await expect(signer.signMessage('hello')).rejects.toThrow(Error);

      expect(personalSign).not.toHaveBeenCalled();
      expectZeroed(issuedSeeds[0]);
    });
  });
});

describe('getPrimarySrpSeed', () => {
  const unavailableError = new MfaRecoveryControllerError(
    'The primary SRP is unavailable',
    'primary_account_unavailable',
  );

  it('returns a copy of the primary HD keyring seed when unlocked', async () => {
    const keyringSeed = new Uint8Array(testSeed);
    const { primarySrpKeyring, withKeyringV2Unsafe } = createPrimarySrpKeyring({
      keyring: { seed: keyringSeed },
    });

    const seed = await getPrimarySrpSeed(primarySrpKeyring);

    expect(withKeyringV2Unsafe).toHaveBeenCalledWith(
      { id: ENTROPY_SOURCE_ID },
      expect.any(Function),
    );
    expect(bytesToHex(seed)).toBe(bytesToHex(keyringSeed));
    expect(seed).not.toBe(keyringSeed);
    seed.fill(0);
    expect(bytesToHex(keyringSeed)).toBe(bytesToHex(testSeed));
  });

  it('throws primary_account_unavailable without reading the keyring when locked', async () => {
    const { primarySrpKeyring, withKeyringV2Unsafe } = createPrimarySrpKeyring({
      state: createKeyringState({ isUnlocked: false }),
    });

    await expect(getPrimarySrpSeed(primarySrpKeyring)).rejects.toEqual(
      unavailableError,
    );
    expect(withKeyringV2Unsafe).not.toHaveBeenCalled();
  });

  it('throws primary_account_unavailable when there is no HD keyring', async () => {
    const { primarySrpKeyring, withKeyringV2Unsafe } = createPrimarySrpKeyring({
      state: createKeyringState({
        keyrings: [
          {
            type: SIMPLE_KEYRING_TYPE,
            accounts: ['0x2222222222222222222222222222222222222222'],
            metadata: { id: 'simple-keyring-id', name: '' },
          },
        ],
      }),
    });

    await expect(getPrimarySrpSeed(primarySrpKeyring)).rejects.toEqual(
      unavailableError,
    );
    expect(withKeyringV2Unsafe).not.toHaveBeenCalled();
  });

  it.each([
    ['is missing', {}],
    ['is null', { seed: null }],
  ])(
    'throws primary_account_unavailable when the keyring seed %s',
    async (_description, keyring) => {
      const { primarySrpKeyring } = createPrimarySrpKeyring({ keyring });

      await expect(getPrimarySrpSeed(primarySrpKeyring)).rejects.toEqual(
        unavailableError,
      );
    },
  );
});
