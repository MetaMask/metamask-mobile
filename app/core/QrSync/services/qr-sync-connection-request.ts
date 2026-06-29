import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import type { QrSyncConnectionRequest } from '../types';
import { isUUID } from '../../SDKConnect/utils/isUUID';
import { extractMwpConnectJsonString } from '../../SDKConnectV2/utils/parseMwpConnectDeeplink';

const HANDSHAKE_CHANNEL_REGEX =
  /^handshake:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

/** Validates the low-level session request scanned from the QR code. */
export function isQrSyncSessionRequest(data: unknown): data is SessionRequest {
  if (!isRecord(data)) {
    return false;
  }

  const sessionRequest = data as Partial<SessionRequest>;

  if (
    !sessionRequest.id ||
    typeof sessionRequest.id !== 'string' ||
    !isUUID(sessionRequest.id)
  ) {
    return false;
  }

  if (
    !sessionRequest.publicKeyB64 ||
    typeof sessionRequest.publicKeyB64 !== 'string' ||
    sessionRequest.publicKeyB64.length > 200
  ) {
    return false;
  }

  try {
    const decoded = Buffer.from(sessionRequest.publicKeyB64, 'base64');
    if (decoded.length !== 33) {
      return false;
    }
  } catch {
    return false;
  }

  if (
    !sessionRequest.channel ||
    typeof sessionRequest.channel !== 'string' ||
    !HANDSHAKE_CHANNEL_REGEX.test(sessionRequest.channel)
  ) {
    return false;
  }

  if (
    !sessionRequest.mode ||
    typeof sessionRequest.mode !== 'string' ||
    !['trusted', 'untrusted'].includes(sessionRequest.mode)
  ) {
    return false;
  }

  if (
    typeof sessionRequest.expiresAt !== 'number' ||
    Number.isNaN(sessionRequest.expiresAt) ||
    sessionRequest.expiresAt < Date.now()
  ) {
    return false;
  }

  return true;
}

/** Validates the QR entry payload shape after decoding/parsing. */
export function isQrSyncConnectionRequest(
  data: unknown,
): data is QrSyncConnectionRequest {
  if (isQrSyncSessionRequest(data)) {
    return true;
  }

  if (!isRecord(data) || !('sessionRequest' in data)) {
    return false;
  }

  return isQrSyncSessionRequest(data.sessionRequest);
}

const decodeMaybeBase64Json = (raw: string): string => {
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    if (Buffer.from(decoded, 'utf-8').toString('base64') === raw) {
      return decoded;
    }
  } catch {
    // Fall through and return the raw string below.
  }

  return raw;
};

const normalizeQrSyncRawPayload = (rawQrData: string): string => {
  const trimmed = rawQrData.trim();

  if (trimmed.startsWith('metamask://connect/mwp')) {
    try {
      return extractMwpConnectJsonString(trimmed);
    } catch {
      // Fall through to the generic decode path below.
    }
  }

  return decodeMaybeBase64Json(trimmed);
};

/**
 * Parses the raw QR scan payload into a validated QR sync connection request.
 *
 * Accepts either a direct JSON-serialized `SessionRequest` or a wrapped
 * `{ sessionRequest }` object. If the QR encodes base64 JSON, that is also
 * supported.
 */
export function parseQrSyncConnectionRequest(
  rawQrData: string,
): QrSyncConnectionRequest {
  if (!rawQrData || typeof rawQrData !== 'string') {
    throw new Error('QR sync scan payload must be a non-empty string.');
  }

  let parsed: unknown;
  const decodedPayload = normalizeQrSyncRawPayload(rawQrData);

  try {
    parsed = JSON.parse(decodedPayload);
  } catch {
    throw new Error('QR sync scan payload is not valid JSON.');
  }

  if (!isQrSyncConnectionRequest(parsed)) {
    throw new Error(
      'QR sync scan payload does not contain a valid session request.',
    );
  }

  if (isQrSyncSessionRequest(parsed)) {
    return { sessionRequest: parsed };
  }

  return parsed;
}
