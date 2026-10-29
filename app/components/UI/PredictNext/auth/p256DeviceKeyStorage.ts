import { p256 } from '@noble/curves/nist';

import SecureKeychain from '../../../../core/SecureKeychain';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import type { VenueAuthenticationProfile } from './venueAuthProfiles';

const PERSISTED_KEY_VERSION = 2;
const P256_PUBLIC_KEY_LENGTH = 65;
const DEVICE_KEY_ACCOUNT = 'device-key';
const DEVICE_KEY_SERVICE_PREFIX = 'com.metamask.predict.device-key';

type DeviceKeyProfile = VenueAuthenticationProfile['deviceKey'];

export interface StoredP256DeviceKey {
  keySlot: string;
  secretKey: Uint8Array;
  publicRaw: Uint8Array;
  saltRaw: Uint8Array;
}

export async function readPersistedP256DeviceKey(
  profile: DeviceKeyProfile,
): Promise<StoredP256DeviceKey | null> {
  const item = await SecureKeychain.getSecureItem(getSecureScope(profile));
  if (!item?.value) {
    return null;
  }
  return parseOrDiscard(profile, item.value);
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

function parseOrDiscard(
  profile: DeviceKeyProfile,
  payload: string,
): StoredP256DeviceKey | null {
  const key = parsePersistedKey(profile, payload);
  if (!key) {
    Logger.error(
      new Error('Predict device key record was discarded'),
      'Predict device key record was discarded',
    );
  }
  return key;
}

function parsePersistedKey(
  profile: DeviceKeyProfile,
  payload: string,
): StoredP256DeviceKey | null {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!isPersistedRecord(profile, parsed)) {
      return null;
    }

    const secretKey = fromBase64Url(parsed.secretKey);
    const saltRaw = fromBase64Url(parsed.salt);
    if (
      !p256.utils.isValidSecretKey(secretKey) ||
      saltRaw.length !== profile.saltLength
    ) {
      return null;
    }

    const publicRaw = p256.getPublicKey(secretKey, false);
    if (publicRaw.length !== P256_PUBLIC_KEY_LENGTH || publicRaw[0] !== 0x04) {
      return null;
    }

    return {
      keySlot: profile.keySlot,
      secretKey: copyBytes(secretKey),
      publicRaw: copyBytes(publicRaw),
      saltRaw: copyBytes(saltRaw),
    };
  } catch {
    return null;
  }
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
