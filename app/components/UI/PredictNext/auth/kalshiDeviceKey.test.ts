// Node verifies the signature independently of @noble/curves.
// eslint-disable-next-line import-x/no-nodejs-modules
import { createHash, createPublicKey, verify } from 'crypto';

import { p256 } from '@noble/curves/nist';

import SecureKeychain from '../../../../core/SecureKeychain';
import Logger from '../../../../util/Logger';
import {
  DEFAULT_PREDICT_CONFIG,
  type PredictConfig,
} from '../config/predictConfig';
import {
  KALSHI_DEVICE_KEY_SCOPE,
  KALSHI_DEVICE_PUBLIC_KEY_LENGTH,
  KALSHI_DEVICE_SALT_LENGTH,
  KALSHI_DEVICE_SIGNATURE_LENGTH,
  clearKalshiDeviceKey,
  deleteKalshiDeviceKey,
  ensureKalshiDeviceKey,
  getKalshiDeviceKey,
  isKalshiDeviceKeyEnabled,
  kalshiDeviceKeyCommitment,
  signWithKalshiDeviceKey,
  type KalshiDevicePublicMaterial,
} from './kalshiDeviceKey';

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

const kalshiDisabledConfig: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: true },
    kalshi: { enabled: false },
  },
  venueSelection: { enabled: false },
};

const bothVenuesConfig: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: true },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: true },
};

const requireDeviceMaterial = (
  material: KalshiDevicePublicMaterial | null,
): KalshiDevicePublicMaterial => {
  if (!material) {
    throw new Error('expected Kalshi device key material');
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

describe('kalshiDeviceKey', () => {
  let saved: string | null;

  beforeEach(() => {
    jest.clearAllMocks();
    saved = null;
    (SecureKeychain.getSecureItem as jest.Mock).mockImplementation(async () =>
      saved === null ? null : { key: 'kalshi-device-key', value: saved },
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
  });

  it('reports Kalshi enabled only when Predict and the Kalshi venue are on', () => {
    expect(isKalshiDeviceKeyEnabled(enabledConfig)).toBe(true);
    expect(isKalshiDeviceKeyEnabled(bothVenuesConfig)).toBe(true);
    expect(isKalshiDeviceKeyEnabled(kalshiDisabledConfig)).toBe(false);
    expect(isKalshiDeviceKeyEnabled(DEFAULT_PREDICT_CONFIG)).toBe(false);
  });

  it('creates an uncompressed P-256 public key and stores the secret with the salt', async () => {
    const material = requireDeviceMaterial(
      await ensureKalshiDeviceKey(enabledConfig, true),
    );

    expect(material.publicRaw).toHaveLength(KALSHI_DEVICE_PUBLIC_KEY_LENGTH);
    expect(material.publicRaw[0]).toBe(0x04);
    expect(material.saltRaw).toHaveLength(KALSHI_DEVICE_SALT_LENGTH);
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
      secretKey: string;
      salt: string;
    };
    expect(SecureKeychain.setSecureItem).toHaveBeenCalledWith(
      'kalshi-device-key',
      saved,
      KALSHI_DEVICE_KEY_SCOPE,
    );
    expect(Object.keys(persisted).sort()).toEqual(['salt', 'secretKey', 'v']);
    expect(persisted.v).toBe(1);
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

  it('returns null and keeps the encrypted key when Kalshi is disabled', async () => {
    const first = await ensureKalshiDeviceKey(enabledConfig, true);

    const material = await ensureKalshiDeviceKey(kalshiDisabledConfig, true);

    expect(material).toBeNull();
    expect(getKalshiDeviceKey()).toBeNull();
    expect(SecureKeychain.clearSecureScope).not.toHaveBeenCalled();

    const restored = await ensureKalshiDeviceKey(enabledConfig, true);
    expect(restored?.publicKey).toBe(first?.publicKey);
  });

  it('returns null when Predict is disabled', async () => {
    const material = await ensureKalshiDeviceKey(
      { ...enabledConfig, enabled: false },
      true,
    );

    expect(material).toBeNull();
    expect(getKalshiDeviceKey()).toBeNull();
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

  it('creates a key when Kalshi is enabled alongside Polymarket', async () => {
    const material = await ensureKalshiDeviceKey(bothVenuesConfig, true);

    expect(material?.publicRaw[0]).toBe(0x04);
  });

  it('replaces a corrupt stored record with a new key', async () => {
    saved = 'not-a-key';

    const material = await ensureKalshiDeviceKey(enabledConfig, true);

    expect(material?.publicRaw[0]).toBe(0x04);
    expect(saved).not.toBe('not-a-key');
    expect(JSON.parse(saved ?? '{}')).toEqual(
      expect.objectContaining({ v: 1 }),
    );
  });

  it('leaves memory empty when the keychain write fails', async () => {
    (SecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(false);

    await expect(ensureKalshiDeviceKey(enabledConfig, true)).rejects.toThrow(
      'Kalshi device key was not stored',
    );
    expect(getKalshiDeviceKey()).toBeNull();
  });

  it('does not keep a key created after memory was cleared mid-read', async () => {
    let resolveRead: (value: null) => void = () => undefined;
    (SecureKeychain.getSecureItem as jest.Mock).mockReturnValue(
      new Promise<null>((resolve) => {
        resolveRead = resolve;
      }),
    );

    const pending = ensureKalshiDeviceKey(enabledConfig, true);
    clearKalshiDeviceKey();
    resolveRead(null);

    await expect(pending).resolves.toBeNull();
    expect(getKalshiDeviceKey()).toBeNull();
    expect(SecureKeychain.setSecureItem).not.toHaveBeenCalled();
  });

  it('deletes the encrypted key after an in-flight write and creates a new one later', async () => {
    let releaseWrite: (stored: boolean) => void = () => undefined;
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      (_key: string, value: string) =>
        new Promise<boolean>((resolve) => {
          releaseWrite = (storedItem) => {
            if (storedItem) {
              saved = value;
            }
            resolve(storedItem);
          };
        }),
    );

    const pending = ensureKalshiDeviceKey(enabledConfig, true);
    for (
      let attempt = 0;
      attempt < 20 &&
      (SecureKeychain.setSecureItem as jest.Mock).mock.calls.length === 0;
      attempt += 1
    ) {
      await Promise.resolve();
    }
    expect(SecureKeychain.setSecureItem).toHaveBeenCalled();

    const deleted = deleteKalshiDeviceKey();

    expect(getKalshiDeviceKey()).toBeNull();
    expect(SecureKeychain.clearSecureScope).not.toHaveBeenCalled();

    releaseWrite(true);
    await expect(pending).resolves.toBeNull();
    await deleted;

    expect(saved).toBeNull();
    expect(SecureKeychain.clearSecureScope).toHaveBeenCalledWith(
      KALSHI_DEVICE_KEY_SCOPE,
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
      'Failed to delete Kalshi device key',
    );
    errorSpy.mockRestore();
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

    expect(signature).toHaveLength(KALSHI_DEVICE_SIGNATURE_LENGTH);
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

  it('throws when asked to sign with no device key', async () => {
    await expect(signWithKalshiDeviceKey(Uint8Array.of(1))).rejects.toThrow(
      'Kalshi device key is not available',
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
