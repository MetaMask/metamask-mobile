// Node verifies the signature independently of QuickCrypto.
// eslint-disable-next-line import-x/no-nodejs-modules
import { createHash, createPublicKey, verify } from 'crypto';

import { p256 } from '@noble/curves/nist';
import QuickCrypto from 'react-native-quick-crypto';

import SecureKeychain from '../../../../core/SecureKeychain';
import Logger from '../../../../util/Logger';
import type { PredictConfig } from '../config/predictConfig';
import {
  P256_DEVICE_PUBLIC_KEY_LENGTH,
  P256_DEVICE_SALT_LENGTH,
  P256_DEVICE_SIGNATURE_LENGTH,
  createP256DeviceKey,
  type P256DevicePublicMaterial,
} from './p256DeviceKey';
import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';
import * as deviceCrypto from './p256QuickCrypto';
import * as deviceKeyStorage from './p256DeviceKeyStorage';
import type { PersistedP256DeviceKeyRead } from './p256DeviceKeyStorage';

// The global stub returns fixed bytes. QuickCrypto's own Jest mock forwards
// to node:crypto, so key generation, signing, and hashing are real here.
jest.mock('react-native-quick-crypto', () =>
  jest.requireActual('react-native-quick-crypto/jest'),
);

jest.mock('../../../../core/SecureKeychain', () => ({
  setSecureItem: jest.fn(),
  getSecureItem: jest.fn(),
  clearSecureScope: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
}));

const enabledConfig: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: false },
};

const deviceKey = createP256DeviceKey(KALSHI_AUTHENTICATION_PROFILE.deviceKey);
const DEVICE_KEY_SCOPE = {
  service: 'com.metamask.predict.device-key.kalshi-v1',
  accessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
};
const ensureKalshiDeviceKey = (
  _config: PredictConfig,
  walletUnlocked: boolean,
) => deviceKey.ensure(walletUnlocked);
const getKalshiDeviceKey = deviceKey.get;
const waitForKalshiDeviceKey = deviceKey.wait;
const clearKalshiDeviceKey = deviceKey.clear;
const deleteKalshiDeviceKey = deviceKey.delete;
const signWithKalshiDeviceKey = deviceKey.sign;
const kalshiDeviceKeyCommitment = deviceKey.commitment;

const requireDeviceMaterial = (
  material: P256DevicePublicMaterial | null,
): P256DevicePublicMaterial => {
  if (!material) {
    throw new Error('expected P-256 device key material');
  }
  return material;
};

const bytesToBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/u, '');

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return new Uint8Array(
    Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
  );
};

const P256_ORDER = BigInt(
  '0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551',
);

const sOf = (signature: Uint8Array): bigint =>
  BigInt(`0x${Buffer.from(signature.subarray(32)).toString('hex')}`);

const withS = (signature: Uint8Array, s: bigint): Uint8Array => {
  const out = new Uint8Array(signature);
  out.set(Buffer.from(s.toString(16).padStart(64, '0'), 'hex'), 32);
  return out;
};

const publicKeyFromRaw = (raw: Uint8Array) =>
  createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: Buffer.from(raw.subarray(1, 33)).toString('base64url'),
      y: Buffer.from(raw.subarray(33, 65)).toString('base64url'),
    },
    format: 'jwk',
  });

// The mobile TypeScript library target is ES2022, before Promise.withResolvers.
const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('p256DeviceKey', () => {
  let saved: string | null;

  beforeEach(() => {
    jest.clearAllMocks();
    saved = null;
    (SecureKeychain.getSecureItem as jest.Mock).mockImplementation(async () =>
      saved === null ? null : { key: 'device-key', value: saved },
    );
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      async (_key: string, value: string) => {
        saved = value;
        return true;
      },
    );
    (SecureKeychain.clearSecureScope as jest.Mock).mockImplementation(
      async () => {
        saved = null;
        return true;
      },
    );
  });

  afterEach(() => {
    clearKalshiDeviceKey();
    jest.restoreAllMocks();
  });

  it('rejects a profile outside the allowlisted P-256 contract', () => {
    expect(() =>
      createP256DeviceKey({
        ...KALSHI_AUTHENTICATION_PROFILE.deviceKey,
        implementation: 'device-p256-v1',
      } as never),
    ).toThrow('Unsupported P-256 device key profile');
  });

  it('derives isolated generic storage from another provider key slot', async () => {
    const providerDeviceKey = createP256DeviceKey({
      ...KALSHI_AUTHENTICATION_PROFILE.deviceKey,
      keySlot: 'provider-b-v1',
    });

    await providerDeviceKey.ensure(true);

    expect(SecureKeychain.setSecureItem).toHaveBeenCalledWith(
      'device-key',
      expect.any(String),
      {
        service: 'com.metamask.predict.device-key.provider-b-v1',
        accessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
      },
    );
  });

  it('creates an uncompressed P-256 public key and stores the secret with the salt', async () => {
    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );

    expect(material.publicRaw).toHaveLength(P256_DEVICE_PUBLIC_KEY_LENGTH);
    expect(material.publicRaw[0]).toBe(0x04);
    expect(material.saltRaw).toHaveLength(P256_DEVICE_SALT_LENGTH);
    expect(p256.utils.isValidPublicKey(material.publicRaw, false)).toBe(true);
    expect(material.publicKey).toBe(bytesToBase64Url(material.publicRaw));
    expect(material.salt).toBe(bytesToBase64Url(material.saltRaw));
    expect(Object.keys(material ?? {}).sort()).toEqual([
      'publicKey',
      'publicRaw',
      'salt',
      'saltRaw',
    ]);

    const persisted = JSON.parse(saved ?? '{}') as {
      v: number;
      keySlot: string;
      secretKey: string;
      salt: string;
    };
    expect(SecureKeychain.setSecureItem).toHaveBeenCalledWith(
      'device-key',
      saved,
      DEVICE_KEY_SCOPE,
    );
    expect(Object.keys(persisted).sort()).toEqual([
      'keySlot',
      'salt',
      'secretKey',
      'v',
    ]);
    expect(persisted.v).toBe(2);
    expect(persisted.keySlot).toBe('kalshi-v1');
    expect(persisted.salt).toBe(material.salt);
    expect(
      p256.utils.isValidSecretKey(fromBase64Url(persisted.secretKey)),
    ).toBe(true);
    expect(
      p256.getPublicKey(fromBase64Url(persisted.secretKey), false),
    ).toEqual(material.publicRaw);
  });

  it('returns the same public key and salt on a later call', async () => {
    const first = await ensureKalshiDeviceKey(enabledConfig, true);
    const second = await ensureKalshiDeviceKey(enabledConfig, true);

    expect(second?.publicKey).toBe(first?.publicKey);
    expect(second?.salt).toBe(first?.salt);
    expect(SecureKeychain.setSecureItem).toHaveBeenCalledTimes(1);
    expect(getKalshiDeviceKey()?.publicKey).toBe(first?.publicKey);
  });

  it('reloads the same key from SecureKeychain after memory is cleared', async () => {
    const first = await ensureKalshiDeviceKey(enabledConfig, true);

    clearKalshiDeviceKey();
    expect(getKalshiDeviceKey()).toBeNull();

    const second = await ensureKalshiDeviceKey(enabledConfig, true);

    expect(second?.publicKey).toBe(first?.publicKey);
    expect(second?.salt).toBe(first?.salt);
    expect(SecureKeychain.setSecureItem).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an unversioned record', { v: 1 }],
    ['a fractional version', { v: 2.5 }],
    ['a record for another key slot', { v: 2, keySlot: 'other-v1' }],
  ])('discards %s and creates a new key', async (_label, header) => {
    const secretKey = new Uint8Array(32);
    secretKey[31] = 1;
    saved = JSON.stringify({
      ...header,
      secretKey: bytesToBase64Url(secretKey),
      salt: bytesToBase64Url(new Uint8Array(16)),
    });

    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );

    expect(material.publicRaw).not.toEqual(p256.getPublicKey(secretKey, false));
    expect(JSON.parse(saved ?? '{}')).toEqual(
      expect.objectContaining({ v: 2, keySlot: 'kalshi-v1' }),
    );
    expect(SecureKeychain.getSecureItem).toHaveBeenCalledTimes(1);
    expect(SecureKeychain.getSecureItem).toHaveBeenCalledWith(DEVICE_KEY_SCOPE);
  });

  it('leaves a newer device key record in place', async () => {
    const secretKey = new Uint8Array(32);
    secretKey[31] = 1;
    const record = {
      v: 3,
      keySlot: 'kalshi-v1',
      secretKey: bytesToBase64Url(secretKey),
      salt: bytesToBase64Url(new Uint8Array(16)),
      extra: 'future',
    };
    saved = JSON.stringify(record);

    const material = await ensureKalshiDeviceKey(enabledConfig, true);

    expect(material).toBeNull();
    expect(getKalshiDeviceKey()).toBeNull();
    expect(saved).toBe(JSON.stringify(record));
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('returns null and does not read the keychain when the wallet is locked', async () => {
    const material = await ensureKalshiDeviceKey(enabledConfig, false);

    expect(material).toBeNull();
    expect(SecureKeychain.getSecureItem).not.toHaveBeenCalled();
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('drops plaintext when the wallet locks and reloads it after unlock', async () => {
    const first = await ensureKalshiDeviceKey(enabledConfig, true);

    const locked = await ensureKalshiDeviceKey(enabledConfig, false);
    const restored = await ensureKalshiDeviceKey(enabledConfig, true);

    expect(locked).toBeNull();
    expect(restored?.publicKey).toBe(first?.publicKey);
    expect(SecureKeychain.clearSecureScope).not.toHaveBeenCalled();
  });

  it('replaces a corrupt stored record with a new key', async () => {
    saved = 'not-a-key';

    const material = await ensureKalshiDeviceKey(enabledConfig, true);

    expect(material?.publicRaw[0]).toBe(0x04);
    expect(saved).not.toBe('not-a-key');
    expect(JSON.parse(saved ?? '{}')).toEqual(
      expect.objectContaining({ v: 2, keySlot: 'kalshi-v1' }),
    );
  });

  it('leaves memory empty when the keychain write fails', async () => {
    (SecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(false);

    await expect(ensureKalshiDeviceKey(enabledConfig, true)).rejects.toThrow(
      'Predict device key was not stored',
    );
    expect(getKalshiDeviceKey()).toBeNull();
  });

  it('does not keep a key created after memory was cleared mid-read', async () => {
    const read = deferred<null>();
    const started = deferred<void>();
    (SecureKeychain.getSecureItem as jest.Mock).mockImplementationOnce(() => {
      started.resolve();
      return read.promise;
    });

    const pending = ensureKalshiDeviceKey(enabledConfig, true);
    await started.promise;
    clearKalshiDeviceKey();
    read.resolve(null);

    await expect(pending).resolves.toBeNull();
    expect(getKalshiDeviceKey()).toBeNull();
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('forgets imported plaintext when a delayed key load completes after deletion', async () => {
    await ensureKalshiDeviceKey(enabledConfig, true);
    clearKalshiDeviceKey();
    const imported = deferred<PersistedP256DeviceKeyRead>();
    const released = deferred<void>();
    const read = deviceKeyStorage.readPersistedP256DeviceKey;
    jest
      .spyOn(deviceKeyStorage, 'readPersistedP256DeviceKey')
      .mockImplementationOnce(async (profile) => {
        const result = await read(profile);
        imported.resolve(result);
        await released.promise;
        return result;
      });
    const pending = ensureKalshiDeviceKey(enabledConfig, true);
    const result = await imported.promise;
    if (result.status !== 'present') {
      throw new Error('persisted key was not imported');
    }
    const deleted = deleteKalshiDeviceKey();
    released.resolve();

    await expect(pending).resolves.toBeNull();
    await deleted;
    expect(result.key.secretKey.every((byte) => byte === 0)).toBe(true);
    expect(result.key.saltRaw.every((byte) => byte === 0)).toBe(true);
    expect(result.key.publicRaw.every((byte) => byte === 0)).toBe(true);
    expect(getKalshiDeviceKey()).toBeNull();
    expect(saved).toBeNull();
  });

  it('does not persist a key whose native creation completes after deletion', async () => {
    const generated = deferred<void>();
    const released = deferred<void>();
    const generate = deviceCrypto.generateP256Key;
    jest.spyOn(deviceCrypto, 'generateP256Key').mockImplementationOnce(async () => {
      const key = await generate();
      generated.resolve();
      await released.promise;
      return key;
    });
    const pending = ensureKalshiDeviceKey(enabledConfig, true);
    await generated.promise;
    const deleted = deleteKalshiDeviceKey();
    released.resolve();

    await expect(pending).resolves.toBeNull();
    await deleted;
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
    expect(getKalshiDeviceKey()).toBeNull();
    expect(saved).toBeNull();
    await expect(
      ensureKalshiDeviceKey(enabledConfig, true),
    ).resolves.not.toBeNull();
  });

  it('deletes the encrypted key after an in-flight write and creates a new one later', async () => {
    let releaseWrite: (stored: boolean) => void = () => undefined;
    let writeStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      writeStarted = resolve;
    });
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      (_key: string, value: string) =>
        new Promise<boolean>((resolve) => {
          releaseWrite = (storedItem) => {
            if (storedItem) {
              saved = value;
            }
            resolve(storedItem);
          };
          writeStarted();
        }),
    );

    const pending = ensureKalshiDeviceKey(enabledConfig, true);
    await started;
    expect(SecureKeychain.setSecureItem).toHaveBeenCalled();

    const deleted = deleteKalshiDeviceKey();

    expect(getKalshiDeviceKey()).toBeNull();
    expect(SecureKeychain.clearSecureScope).not.toHaveBeenCalled();

    releaseWrite(true);
    await expect(pending).resolves.toBeNull();
    await deleted;

    expect(saved).toBeNull();
    expect(SecureKeychain.clearSecureScope).toHaveBeenCalledWith(
      DEVICE_KEY_SCOPE,
    );

    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      async (_key: string, value: string) => {
        saved = value;
        return true;
      },
    );
    const recreated = await ensureKalshiDeviceKey(enabledConfig, true);
    expect(recreated?.publicRaw[0]).toBe(0x04);
    expect(saved).not.toBeNull();
  });

  it('logs a keychain delete failure and still drops the in-memory key', async () => {
    await ensureKalshiDeviceKey(enabledConfig, true);
    const errorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    (SecureKeychain.clearSecureScope as jest.Mock).mockRejectedValueOnce(
      new Error('keychain failed'),
    );

    await expect(deleteKalshiDeviceKey()).resolves.toBeUndefined();

    expect(getKalshiDeviceKey()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'keychain failed' }),
      'Failed to delete Predict device key',
    );
    errorSpy.mockRestore();
  });

  it('waits for a queued load and returns the held key without loading one', async () => {
    const pending = ensureKalshiDeviceKey(enabledConfig, true);

    const waited = await waitForKalshiDeviceKey();

    expect(waited?.publicKey).toBe((await pending)?.publicKey);
    expect(SecureKeychain.getSecureItem).toHaveBeenCalledTimes(1);
  });

  it('returns null and touches no storage when no key is held', async () => {
    saved = JSON.stringify({ v: 1, secretKey: 'unused', salt: 'unused' });

    await expect(waitForKalshiDeviceKey()).resolves.toBeNull();

    expect(SecureKeychain.getSecureItem).not.toHaveBeenCalled();
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
    expect(getKalshiDeviceKey()).toBeNull();
  });

  it('returns null after a reset races a queued load and does not write again', async () => {
    const pending = ensureKalshiDeviceKey(enabledConfig, true);
    const deleted = deleteKalshiDeviceKey();

    await expect(waitForKalshiDeviceKey()).resolves.toBeNull();
    await expect(pending).resolves.toBeNull();
    await deleted;

    expect(getKalshiDeviceKey()).toBeNull();
    expect(saved).toBeNull();
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('signs SHA-256 ECDSA as 64-byte r||s that Node can verify', async () => {
    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );
    const message = Buffer.from(
      'kalshi-a2t-request-v1\nchallenge\npub\nsalt',
      'utf8',
    );

    const signature = await signWithKalshiDeviceKey(message);

    expect(signature).toHaveLength(P256_DEVICE_SIGNATURE_LENGTH);
    expect(
      verify(
        'sha256',
        message,
        {
          key: publicKeyFromRaw(material.publicRaw),
          dsaEncoding: 'ieee-p1363',
        },
        signature,
      ),
    ).toBe(true);
    expect(
      verify(
        'sha256',
        Buffer.from('other message'),
        {
          key: publicKeyFromRaw(material.publicRaw),
          dsaEncoding: 'ieee-p1363',
        },
        signature,
      ),
    ).toBe(false);
  });

  it('returns 64-byte low-S signatures', async () => {
    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );

    for (let index = 0; index < 32; index += 1) {
      const message = Buffer.from(`low-s-${index}`, 'utf8');
      const signature = await signWithKalshiDeviceKey(message);

      expect(signature).toHaveLength(P256_DEVICE_SIGNATURE_LENGTH);
      expect(sOf(signature) <= P256_ORDER / 2n).toBe(true);
      expect(
        verify(
          'sha256',
          message,
          {
            key: publicKeyFromRaw(material.publicRaw),
            dsaEncoding: 'ieee-p1363',
          },
          signature,
        ),
      ).toBe(true);
    }
  });

  it('normalizes a high-S native signature to n - s', async () => {
    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );
    const message = Buffer.from('high-s', 'utf8');
    const lowS = await signWithKalshiDeviceKey(message);
    const highS = withS(lowS, P256_ORDER - sOf(lowS));
    const signSpy = jest
      .spyOn(QuickCrypto.subtle, 'sign')
      .mockResolvedValueOnce(highS.slice().buffer);

    const signature = await signWithKalshiDeviceKey(message);

    expect(sOf(highS) > P256_ORDER / 2n).toBe(true);
    expect(signature).toEqual(lowS);
    expect(
      verify(
        'sha256',
        message,
        {
          key: publicKeyFromRaw(material.publicRaw),
          dsaEncoding: 'ieee-p1363',
        },
        signature,
      ),
    ).toBe(true);
    signSpy.mockRestore();
  });

  it('loads a stored raw private scalar and derives its public key', async () => {
    const secretKey = new Uint8Array(32);
    secretKey[31] = 7;
    const saltRaw = new Uint8Array(16).fill(9);
    saved = JSON.stringify({
      v: 2,
      keySlot: 'kalshi-v1',
      secretKey: bytesToBase64Url(secretKey),
      salt: bytesToBase64Url(saltRaw),
    });

    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );

    expect(material.publicRaw).toEqual(p256.getPublicKey(secretKey, false));
    expect(material.saltRaw).toEqual(saltRaw);
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it.each([
    ['zero', new Uint8Array(32)],
    [
      'the group order',
      Uint8Array.from(Buffer.from(P256_ORDER.toString(16), 'hex')),
    ],
  ])(
    'replaces a stored private scalar equal to %s',
    async (_label, secretKey) => {
      saved = JSON.stringify({
        v: 2,
        keySlot: 'kalshi-v1',
        secretKey: bytesToBase64Url(secretKey),
        salt: bytesToBase64Url(new Uint8Array(16)),
      });

      const material = requireDeviceMaterial(
        await ensureKalshiDeviceKey(enabledConfig, true),
      );

      expect(material.publicRaw[0]).toBe(0x04);
      expect(SecureKeychain.setSecureItem).toHaveBeenCalledTimes(1);
    },
  );

  it('throws when asked to sign with no device key', async () => {
    await expect(signWithKalshiDeviceKey(Uint8Array.of(1))).rejects.toThrow(
      'P-256 device key is not available',
    );
  });

  it('computes the A2T nonce as unpadded base64url of SHA-256(key || salt)', async () => {
    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );
    const expected = createHash('sha256')
      .update(material.publicRaw)
      .update(material.saltRaw)
      .digest('base64url');

    const commitment = kalshiDeviceKeyCommitment(
      material.publicRaw,
      material.saltRaw,
    );

    expect(commitment).toBe(expected);
    expect(commitment.includes('=')).toBe(false);
  });

  it('rejects a commitment input that is not a raw P-256 point and salt', async () => {
    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );

    expect(() =>
      kalshiDeviceKeyCommitment(
        material.publicRaw.subarray(0, 32),
        material.saltRaw,
      ),
    ).toThrow('expected a 65-byte uncompressed P-256 public key');
    expect(() =>
      kalshiDeviceKeyCommitment(material.publicRaw, Uint8Array.of(1)),
    ).toThrow('expected a 16-byte device key salt');
  });
});
