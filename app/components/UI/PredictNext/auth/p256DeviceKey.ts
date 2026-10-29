import { p256 } from '@noble/curves/nist';
import { sha256 } from '@noble/hashes/sha2';
import { clean, concatBytes, randomBytes } from '@noble/hashes/utils';

import {
  deletePersistedP256DeviceKey,
  readPersistedP256DeviceKey,
  writePersistedP256DeviceKey,
  type StoredP256DeviceKey,
} from './p256DeviceKeyStorage';
import type { VenueAuthenticationProfile } from './venueAuthProfiles';

/**
 * Allowlisted `device-p256-salt-v1` software key. A bundled venue profile
 * selects this implementation and binds its key slot. This module fixes the
 * uncompressed public key, the raw `r || s` signature, the 16-byte salt, and
 * the SHA-256 commitment. The private key and salt are encrypted in
 * SecureKeychain; plaintext stays in this module only while the wallet is
 * unlocked.
 */

/** Uncompressed SEC1 point: 0x04 || X || Y. */
export const P256_DEVICE_PUBLIC_KEY_LENGTH = 65;

/** Random salt fixed for the lifetime of this device key. */
export const P256_DEVICE_SALT_LENGTH = 16;

/** ECDSA P-256 signature as raw r || s. */
export const P256_DEVICE_SIGNATURE_LENGTH = 64;

export interface P256DevicePublicMaterial {
  /** Raw uncompressed SEC1 point, 65 bytes. */
  publicRaw: Uint8Array;
  /** `publicRaw` as unpadded base64url. Sent as the device public key. */
  publicKey: string;
  /** 16 random bytes. */
  saltRaw: Uint8Array;
  /** `saltRaw` as unpadded base64url. */
  salt: string;
}

let stored: StoredP256DeviceKey | null = null;
let epoch = 0;
let tail: Promise<void> = Promise.resolve();

type DeviceKeyProfile = VenueAuthenticationProfile['deviceKey'];

export interface P256DeviceKey {
  ensure: (walletUnlocked: boolean) => Promise<P256DevicePublicMaterial | null>;
  get: () => P256DevicePublicMaterial | null;
  wait: () => Promise<P256DevicePublicMaterial | null>;
  clear: () => void;
  delete: () => Promise<void>;
  sign: (data: Uint8Array) => Promise<Uint8Array>;
  commitment: (publicRaw: Uint8Array, salt: Uint8Array) => string;
}

/**
 * Binds all key operations to one validated, bundled profile. The profile
 * selects an allowlisted implementation; it is not interpreted as arbitrary
 * cryptographic instructions.
 */
export const createP256DeviceKey = (
  profile: DeviceKeyProfile,
): P256DeviceKey => {
  assertSupportedProfile(profile);
  return {
    ensure: (walletUnlocked) => ensureDeviceKey(profile, walletUnlocked),
    get: () => getDeviceKey(profile),
    wait: () => waitForDeviceKey(profile),
    clear: clearDeviceKey,
    delete: () => deleteDeviceKey(profile),
    sign: (data) => signWithDeviceKey(profile, data),
    commitment: deviceKeyCommitment,
  };
};

/**
 * Loads or creates the profile-bound device key while the wallet is unlocked.
 * Returns null and drops plaintext while locked. Feature gating belongs to the
 * Engine service. The persisted copy remains until the bound delete operation.
 * The private key stays in this module.
 */
function ensureDeviceKey(
  profile: DeviceKeyProfile,
  walletUnlocked: boolean,
): Promise<P256DevicePublicMaterial | null> {
  if (!walletUnlocked) {
    clearDeviceKey();
    return Promise.resolve(null);
  }

  if (stored?.keySlot === profile.keySlot) {
    return Promise.resolve(toPublicMaterial(stored));
  }
  if (stored) {
    clearDeviceKey();
  }

  const epochAtStart = epoch;
  return enqueue(() => loadOrCreate(profile, epochAtStart));
}

/** Public material for the current process, or null when no key is held. */
function getDeviceKey(
  profile: DeviceKeyProfile,
): P256DevicePublicMaterial | null {
  return stored?.keySlot === profile.keySlot ? toPublicMaterial(stored) : null;
}

/**
 * Public material once any queued load or delete has settled. Never loads or
 * creates the key, so a caller outside the Engine service cannot put
 * plaintext back after the bound clear or delete operation.
 */
async function waitForDeviceKey(
  profile: DeviceKeyProfile,
): Promise<P256DevicePublicMaterial | null> {
  await tail;
  return getDeviceKey(profile);
}

/**
 * Drops the in-memory key. The encrypted copy in SecureKeychain stays, and
 * the next unlocked ensure loads the same profile-bound key.
 */
function clearDeviceKey(): void {
  epoch += 1;
  forgetStoredKey();
}

/**
 * Removes the encrypted key and the in-memory copy. Wallet reset calls this.
 * The keychain delete waits until any in-flight write finishes, so that write
 * cannot put the key back. A keychain failure is logged and does not reject,
 * so the caller can keep going.
 */
async function deleteDeviceKey(profile: DeviceKeyProfile): Promise<void> {
  clearDeviceKey();
  await enqueue(() => deletePersistedP256DeviceKey(profile));
}

/** Plaintext key is not loaded. Callers can reload once and sign again. */
export class P256DeviceKeyUnavailableError extends Error {
  constructor() {
    super('P-256 device key is not available');
    this.name = 'P256DeviceKeyUnavailableError';
  }
}

/**
 * ECDSA P-256 over SHA-256 as raw r || s. `data` is the message, not a
 * precomputed digest. The promise lets a later Secure Enclave or Keystore
 * signer replace the body without changing callers.
 */
async function signWithDeviceKey(
  profile: DeviceKeyProfile,
  data: Uint8Array,
): Promise<Uint8Array> {
  if (stored?.keySlot !== profile.keySlot) {
    throw new P256DeviceKeyUnavailableError();
  }

  return p256
    .sign(data, stored.secretKey, {
      prehash: true,
      lowS: true,
    })
    .toBytes('compact');
}

/**
 * Unpadded base64url of SHA-256(raw public key || raw salt).
 */
function deviceKeyCommitment(publicRaw: Uint8Array, salt: Uint8Array): string {
  if (
    publicRaw.length !== P256_DEVICE_PUBLIC_KEY_LENGTH ||
    publicRaw[0] !== 0x04
  ) {
    throw new Error('expected a 65-byte uncompressed P-256 public key');
  }

  if (salt.length !== P256_DEVICE_SALT_LENGTH) {
    throw new Error('expected a 16-byte device key salt');
  }

  return bytesToBase64Url(sha256(concatBytes(publicRaw, salt)));
}

async function loadOrCreate(
  profile: DeviceKeyProfile,
  epochAtStart: number,
): Promise<P256DevicePublicMaterial | null> {
  if (epoch !== epochAtStart) {
    return null;
  }

  if (stored?.keySlot === profile.keySlot) {
    return toPublicMaterial(stored);
  }

  const persisted = await readPersistedP256DeviceKey(profile);
  if (epoch !== epochAtStart) {
    return null;
  }

  if (stored?.keySlot === profile.keySlot) {
    return toPublicMaterial(stored);
  }

  const key = persisted ?? createDeviceKey(profile);
  try {
    if (!persisted) {
      await writePersistedP256DeviceKey(profile, key);
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

function forgetKey(key: StoredP256DeviceKey): void {
  clean(key.secretKey, key.publicRaw, key.saltRaw);
}

function createDeviceKey(profile: DeviceKeyProfile): StoredP256DeviceKey {
  const { secretKey } = p256.keygen();
  const publicRaw = p256.getPublicKey(secretKey, false);
  const saltRaw = randomBytes(P256_DEVICE_SALT_LENGTH);
  const key: StoredP256DeviceKey = {
    keySlot: profile.keySlot,
    secretKey: copyBytes(secretKey),
    publicRaw: copyBytes(publicRaw),
    saltRaw: copyBytes(saltRaw),
  };

  clean(secretKey, publicRaw, saltRaw);
  return key;
}

function toPublicMaterial(key: StoredP256DeviceKey): P256DevicePublicMaterial {
  return {
    publicRaw: copyBytes(key.publicRaw),
    publicKey: bytesToBase64Url(key.publicRaw),
    saltRaw: copyBytes(key.saltRaw),
    salt: bytesToBase64Url(key.saltRaw),
  };
}

function assertSupportedProfile(profile: DeviceKeyProfile): void {
  if (
    profile.implementation !== 'device-p256-salt-v1' ||
    !/^[a-z0-9](?:[a-z0-9-]{0,62})$/u.test(profile.keySlot)
  ) {
    throw new Error('Unsupported P-256 device key profile');
  }
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
