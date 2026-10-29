import { p256 } from '@noble/curves/nist';

import SecureKeychain from '../../../../core/SecureKeychain';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import type { VenueAuthenticationProfile } from './venueAuthProfiles';

const PERSISTED_KEY_VERSION = 2;
const LEGACY_PERSISTED_KEY_VERSION = 1;
const P256_PUBLIC_KEY_LENGTH = 65;
const DEVICE_KEY_ACCOUNT = 'device-key';
const DEVICE_KEY_SERVICE_PREFIX = 'com.metamask.predict.device-key';
const KALSHI_KEY_SLOT = 'kalshi-v1';
const LEGACY_KALSHI_SCOPE = {
  service: 'com.metamask.predict.kalshi.device-key',
  accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

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
  if (item?.value) {
    return parseOrDiscard(profile, item.value, false);
  }

  if (profile.keySlot !== KALSHI_KEY_SLOT) {
    return null;
  }

  const legacyItem = await SecureKeychain.getSecureItem(LEGACY_KALSHI_SCOPE);
  if (!legacyItem?.value) {
    return null;
  }

  const legacyKey = parseOrDiscard(profile, legacyItem.value, true);
  if (!legacyKey) {
    return null;
  }

  await writePersistedP256DeviceKey(profile, legacyKey);
  await clearScope(LEGACY_KALSHI_SCOPE);
  return legacyKey;
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
  if (profile.keySlot === KALSHI_KEY_SLOT) {
    await clearScope(LEGACY_KALSHI_SCOPE);
  }
}

function parseOrDiscard(
  profile: DeviceKeyProfile,
  payload: string,
  allowLegacy: boolean,
): StoredP256DeviceKey | null {
  const key = parsePersistedKey(profile, payload, allowLegacy);
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
  allowLegacy: boolean,
): StoredP256DeviceKey | null {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!isPersistedRecord(profile, parsed, allowLegacy)) {
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
  allowLegacy: boolean,
): value is {
  v: number;
  keySlot?: string;
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
    ((record.v === PERSISTED_KEY_VERSION &&
      record.keySlot === profile.keySlot) ||
      (allowLegacy &&
        (record.v === LEGACY_PERSISTED_KEY_VERSION ||
          (record.v === PERSISTED_KEY_VERSION &&
            record.keySlot === 'kalshi-device-v1')))) &&
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
