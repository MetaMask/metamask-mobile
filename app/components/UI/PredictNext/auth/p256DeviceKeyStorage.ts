import { p256 } from '@noble/curves/nist';

import SecureKeychain from '../../../../core/SecureKeychain';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import type { VenueAuthenticationProfile } from './venueAuthProfiles';

const PERSISTED_KEY_VERSION = 2;
const P256_PUBLIC_KEY_LENGTH = 65;

/** Same 16-byte salt as `P256_DEVICE_SALT_LENGTH` in `p256DeviceKey.ts`. */
const P256_DEVICE_SALT_LENGTH = 16;
const DEVICE_KEY_ACCOUNT = 'device-key';
const DEVICE_KEY_SERVICE_PREFIX = 'com.metamask.predict.device-key';

type DeviceKeyProfile = VenueAuthenticationProfile['deviceKey'];

export interface StoredP256DeviceKey {
  keySlot: string;
  secretKey: Uint8Array;
  publicRaw: Uint8Array;
  saltRaw: Uint8Array;
}

export type PersistedP256DeviceKeyRead =
  | { status: 'present'; key: StoredP256DeviceKey }
  | { status: 'missing' }
  | { status: 'unusable' }
  | { status: 'newer' };

export async function readPersistedP256DeviceKey(
  profile: DeviceKeyProfile,
): Promise<PersistedP256DeviceKeyRead> {
  const item = await SecureKeychain.getSecureItem(getSecureScope(profile));
  if (!item?.value) {
    return { status: 'missing' };
  }

  const read = parsePersistedKey(profile, item.value);
  if (read.status === 'unusable') {
    Logger.error(
      new Error('Predict device key record was discarded'),
      'Predict device key record was discarded',
    );
  }
  return read;
}

export async function writePersistedP256DeviceKey(
  profile: DeviceKeyProfile,
  key: StoredP256DeviceKey,
): Promise<void> {
  const payload = JSON.stringify({
    v: PERSISTED_KEY_VERSION,
    keySlot: profile.keySlot,
    secretKey: bytesToBase64Url(key.secretKey),
    salt: bytesToBase64Url(key.saltRaw),
  });
  const stored = await SecureKeychain.setSecureItem(
    DEVICE_KEY_ACCOUNT,
    payload,
    getSecureScope(profile),
  );
  if (stored === false) {
    throw new Error('Predict device key was not stored');
  }
}

export async function deletePersistedP256DeviceKey(
  profile: DeviceKeyProfile,
): Promise<void> {
  await clearScope(getSecureScope(profile));
}

function parsePersistedKey(
  profile: DeviceKeyProfile,
  payload: string,
): Exclude<PersistedP256DeviceKeyRead, { status: 'missing' }> {
  try {
    const parsed: unknown = JSON.parse(payload);
    const version = readPersistedVersion(parsed);
    if (version !== undefined && version > PERSISTED_KEY_VERSION) {
      return { status: 'newer' };
    }
    if (!isPersistedRecord(profile, parsed)) {
      return { status: 'unusable' };
    }

    const secretKey = fromBase64Url(parsed.secretKey);
    const saltRaw = fromBase64Url(parsed.salt);
    if (
      !p256.utils.isValidSecretKey(secretKey) ||
      saltRaw.length !== P256_DEVICE_SALT_LENGTH
    ) {
      return { status: 'unusable' };
    }

    const publicRaw = p256.getPublicKey(secretKey, false);
    if (publicRaw.length !== P256_PUBLIC_KEY_LENGTH || publicRaw[0] !== 0x04) {
      return { status: 'unusable' };
    }

    return {
      status: 'present',
      key: {
        keySlot: profile.keySlot,
        secretKey: copyBytes(secretKey),
        publicRaw: copyBytes(publicRaw),
        saltRaw: copyBytes(saltRaw),
      },
    };
  } catch {
    return { status: 'unusable' };
  }
}

/** Integer versions above this build stay unread so a downgrade cannot rotate them. */
function readPersistedVersion(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  const version = (value as { v?: unknown }).v;
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return undefined;
  }
  return version;
}

function isPersistedRecord(
  profile: DeviceKeyProfile,
  value: unknown,
): value is {
  v: number;
  keySlot: string;
  secretKey: string;
  salt: string;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as {
    v?: unknown;
    keySlot?: unknown;
    secretKey?: unknown;
    salt?: unknown;
  };
  return (
    record.v === PERSISTED_KEY_VERSION &&
    record.keySlot === profile.keySlot &&
    typeof record.secretKey === 'string' &&
    typeof record.salt === 'string'
  );
}

function getSecureScope(profile: DeviceKeyProfile) {
  return {
    service: `${DEVICE_KEY_SERVICE_PREFIX}.${profile.keySlot}`,
    accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

async function clearScope(
  scope: ReturnType<typeof getSecureScope>,
): Promise<void> {
  try {
    await SecureKeychain.clearSecureScope(scope);
  } catch (error) {
    Logger.error(
      ensureError(error, 'Failed to delete Predict device key'),
      'Failed to delete Predict device key',
    );
  }
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

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
