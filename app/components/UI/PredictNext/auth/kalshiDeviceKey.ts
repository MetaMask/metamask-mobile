import { p256 } from '@noble/curves/nist';
import { sha256 } from '@noble/hashes/sha2';
import { clean, concatBytes, randomBytes } from '@noble/hashes/utils';

import SecureKeychain from '../../../../core/SecureKeychain';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import type { PredictConfig } from '../config/predictConfig';

/**
 * Kalshi device key. Software P-256 with the ISV wire format. The private key
 * and salt are encrypted in SecureKeychain. Plaintext stays in this module
 * only while the wallet is unlocked. Production replacement is documented in
 * `docs/kalshi-device-key.md`.
 */

const KALSHI_DEVICE_KEY_ACCOUNT = 'kalshi-device-key';
const PERSISTED_KEY_VERSION = 1;

export const KALSHI_DEVICE_KEY_SCOPE = {
  service: 'com.metamask.predict.kalshi.device-key',
  accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** Uncompressed SEC1 point: 0x04 || X || Y. */
export const KALSHI_DEVICE_PUBLIC_KEY_LENGTH = 65;

/** Random salt fixed for the lifetime of this device key. */
export const KALSHI_DEVICE_SALT_LENGTH = 16;

/** ECDSA P-256 signature as raw r || s. */
export const KALSHI_DEVICE_SIGNATURE_LENGTH = 64;

export interface KalshiDevicePublicMaterial {
  /** Raw uncompressed SEC1 point, 65 bytes. */
  publicRaw: Uint8Array;
  /** `publicRaw` as unpadded base64url. Sent as the device public key. */
  publicKey: string;
  /** 16 random bytes. */
  saltRaw: Uint8Array;
  /** `saltRaw` as unpadded base64url. */
  salt: string;
}

interface StoredDeviceKey {
  secretKey: Uint8Array;
  publicRaw: Uint8Array;
  saltRaw: Uint8Array;
}

let stored: StoredDeviceKey | null = null;
let epoch = 0;
let tail: Promise<void> = Promise.resolve();

/**
 * Kalshi venue gate from an already resolved `predictConfig`.
 * Parent `enabled` and `venues.kalshi.enabled` both have to be true.
 */
export const isKalshiDeviceKeyEnabled = (config: PredictConfig): boolean =>
  config.enabled && config.venues.kalshi.enabled;

/**
 * Loads or creates the device key when Kalshi is enabled and the wallet is
 * unlocked. Returns null and drops plaintext when either condition is false.
 * The persisted copy remains until `deleteKalshiDeviceKey`.
 * The private key stays in this module.
 */
export const ensureKalshiDeviceKey = (
  config: PredictConfig,
  walletUnlocked: boolean,
): Promise<KalshiDevicePublicMaterial | null> => {
  if (!isKalshiDeviceKeyEnabled(config) || !walletUnlocked) {
    clearKalshiDeviceKey();
    return Promise.resolve(null);
  }

  if (stored) {
    return Promise.resolve(toPublicMaterial(stored));
  }

  const epochAtStart = epoch;
  return enqueue(() => loadOrCreate(epochAtStart));
};

/** Public material for the current process, or null when no key is held. */
export const getKalshiDeviceKey = (): KalshiDevicePublicMaterial | null =>
  stored ? toPublicMaterial(stored) : null;

/**
 * Public material once any queued load or delete has settled. Never loads or
 * creates the key, so a caller outside `KalshiDeviceKeyBootstrap` cannot put
 * plaintext back after `clearKalshiDeviceKey` or `deleteKalshiDeviceKey`.
 */
export const waitForKalshiDeviceKey =
  async (): Promise<KalshiDevicePublicMaterial | null> => {
    await tail;
    return getKalshiDeviceKey();
  };

/**
 * Drops the in-memory key. The encrypted copy in SecureKeychain stays, and
 * the next unlocked `ensureKalshiDeviceKey` loads the same key.
 */
export function clearKalshiDeviceKey(): void {
  epoch += 1;
  forgetStoredKey();
}

/**
 * Removes the encrypted key and the in-memory copy. Wallet reset calls this.
 * The keychain delete waits until any in-flight write finishes, so that write
 * cannot put the key back. A keychain failure is logged and does not reject,
 * so the caller can keep going.
 */
export async function deleteKalshiDeviceKey(): Promise<void> {
  clearKalshiDeviceKey();
  try {
    await enqueue(async () => {
      await SecureKeychain.clearSecureScope(KALSHI_DEVICE_KEY_SCOPE);
    });
  } catch (error) {
    Logger.error(
      ensureError(error, 'Failed to delete Kalshi device key'),
      'Failed to delete Kalshi device key',
    );
  }
}

/** Plaintext key is not loaded. Callers can reload once and sign again. */
export class KalshiDeviceKeyUnavailableError extends Error {
  constructor() {
    super('Kalshi device key is not available');
    this.name = 'KalshiDeviceKeyUnavailableError';
  }
}

/**
 * ECDSA P-256 over SHA-256. Resolves to 64-byte raw r || s, which is the form
 * Kalshi verifies. `data` is the message, not a precomputed digest.
 * The promise is here so a later Secure Enclave or Keystore signer can replace
 * the body without changing callers.
 */
export const signWithKalshiDeviceKey = async (
  data: Uint8Array,
): Promise<Uint8Array> => {
  if (!stored) {
    throw new KalshiDeviceKeyUnavailableError();
  }

  return p256
    .sign(data, stored.secretKey, {
      prehash: true,
      lowS: true,
    })
    .toBytes('compact');
};

/**
 * A2T `nonce` claim: unpadded base64url of SHA-256(raw public key || raw salt).
 * Hashes the raw bytes, matching the ISV spec.
 */
export const kalshiDeviceKeyCommitment = (
  publicRaw: Uint8Array,
  salt: Uint8Array,
): string => {
  if (
    publicRaw.length !== KALSHI_DEVICE_PUBLIC_KEY_LENGTH ||
    publicRaw[0] !== 0x04
  ) {
    throw new Error('expected a 65-byte uncompressed P-256 public key');
  }

  if (salt.length !== KALSHI_DEVICE_SALT_LENGTH) {
    throw new Error('expected a 16-byte device key salt');
  }

  return bytesToBase64Url(sha256(concatBytes(publicRaw, salt)));
};

async function loadOrCreate(
  epochAtStart: number,
): Promise<KalshiDevicePublicMaterial | null> {
  if (epoch !== epochAtStart) {
    return null;
  }

  if (stored) {
    return toPublicMaterial(stored);
  }

  const persisted = await readPersistedKey();
  if (epoch !== epochAtStart) {
    return null;
  }

  if (stored) {
    return toPublicMaterial(stored);
  }

  const key = persisted ?? createDeviceKey();
  try {
    if (!persisted) {
      await writePersistedKey(key);
    }
  } catch (error) {
    forgetKey(key);
    throw error;
  }

  if (epoch !== epochAtStart) {
    forgetKey(key);
    return null;
  }

  stored = key;
  return toPublicMaterial(stored);
}

async function readPersistedKey(): Promise<StoredDeviceKey | null> {
  const item = await SecureKeychain.getSecureItem(KALSHI_DEVICE_KEY_SCOPE);
  if (!item?.value) {
    return null;
  }

  const key = parsePersistedKey(item.value);
  if (key) {
    return key;
  }

  Logger.error(
    new Error('Kalshi device key record was discarded'),
    'Kalshi device key record was discarded',
  );
  return null;
}

async function writePersistedKey(key: StoredDeviceKey): Promise<void> {
  const payload = JSON.stringify({
    v: PERSISTED_KEY_VERSION,
    secretKey: bytesToBase64Url(key.secretKey),
    salt: bytesToBase64Url(key.saltRaw),
  });
  const storedItem = await SecureKeychain.setSecureItem(
    KALSHI_DEVICE_KEY_ACCOUNT,
    payload,
    KALSHI_DEVICE_KEY_SCOPE,
  );

  if (storedItem === false) {
    throw new Error('Kalshi device key was not stored');
  }
}

function parsePersistedKey(payload: string): StoredDeviceKey | null {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!isPersistedRecord(parsed)) {
      return null;
    }

    const secretKey = fromBase64Url(parsed.secretKey);
    const saltRaw = fromBase64Url(parsed.salt);
    if (
      !p256.utils.isValidSecretKey(secretKey) ||
      saltRaw.length !== KALSHI_DEVICE_SALT_LENGTH
    ) {
      return null;
    }

    const publicRaw = p256.getPublicKey(secretKey, false);
    if (
      publicRaw.length !== KALSHI_DEVICE_PUBLIC_KEY_LENGTH ||
      publicRaw[0] !== 0x04
    ) {
      return null;
    }

    return {
      secretKey: copyBytes(secretKey),
      publicRaw: copyBytes(publicRaw),
      saltRaw: copyBytes(saltRaw),
    };
  } catch {
    return null;
  }
}

function isPersistedRecord(
  value: unknown,
): value is { v: number; secretKey: string; salt: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as { v?: unknown; secretKey?: unknown; salt?: unknown };
  return (
    record.v === PERSISTED_KEY_VERSION &&
    typeof record.secretKey === 'string' &&
    typeof record.salt === 'string'
  );
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function forgetStoredKey(): void {
  if (!stored) {
    return;
  }

  forgetKey(stored);
  stored = null;
}

function forgetKey(key: StoredDeviceKey): void {
  clean(key.secretKey, key.publicRaw, key.saltRaw);
}

function createDeviceKey(): StoredDeviceKey {
  const { secretKey } = p256.keygen();
  const publicRaw = p256.getPublicKey(secretKey, false);
  const saltRaw = randomBytes(KALSHI_DEVICE_SALT_LENGTH);
  const key: StoredDeviceKey = {
    secretKey: copyBytes(secretKey),
    publicRaw: copyBytes(publicRaw),
    saltRaw: copyBytes(saltRaw),
  };

  clean(secretKey, publicRaw, saltRaw);
  return key;
}

function toPublicMaterial(key: StoredDeviceKey): KalshiDevicePublicMaterial {
  return {
    publicRaw: copyBytes(key.publicRaw),
    publicKey: bytesToBase64Url(key.publicRaw),
    saltRaw: copyBytes(key.saltRaw),
    salt: bytesToBase64Url(key.saltRaw),
  };
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

/**
 * Manual base64url. The React Native `buffer` polyfill does not reliably
 * support the 'base64url' encoding.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error('expected base64url');
  }

  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return new Uint8Array(
    Buffer.from(padded.replaceAll('-', '+').replaceAll('_', '/'), 'base64'),
  );
}
