import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import { isUUID } from '../SDKConnect/utils/isUUID';

const HANDSHAKE_CHANNEL_REGEX =
  /^handshake:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

/**
 * Add Device QR format (aligned with extension QR sync):
 * `metamask://connect/mwp?p=<base64-encoded-session-request-json>`
 *
 * The `p` query param is base64(JSON), where JSON is either a bare
 * `SessionRequest` or `{ sessionRequest: SessionRequest }`.
 */
export const isAddDeviceQrSessionRequest = (
  data: unknown,
): data is SessionRequest => {
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
};

export const extractAddDeviceQrSessionRequest = (
  data: unknown,
): SessionRequest | null => {
  if (isAddDeviceQrSessionRequest(data)) {
    return data;
  }

  if (!isRecord(data) || !('sessionRequest' in data)) {
    return null;
  }

  return isAddDeviceQrSessionRequest(data.sessionRequest)
    ? data.sessionRequest
    : null;
};

export const extractAddDeviceQrSessionExpiresAt = (
  data: unknown,
): number | null => {
  const sessionRequest = extractAddDeviceQrSessionRequest(data);
  if (sessionRequest) {
    return sessionRequest.expiresAt;
  }

  if (!isRecord(data)) {
    return null;
  }

  if (typeof data.expiresAt === 'number' && !Number.isNaN(data.expiresAt)) {
    return data.expiresAt;
  }

  if (isRecord(data.sessionRequest)) {
    const expiresAt = data.sessionRequest.expiresAt;
    if (typeof expiresAt === 'number' && !Number.isNaN(expiresAt)) {
      return expiresAt;
    }
  }

  return null;
};

export const decodeAddDeviceQrPayloadFromMwpDeeplink = (
  url: string,
): unknown => {
  const parsed = new URL(url);
  const payload = parsed.searchParams.get('p');

  if (!payload) {
    throw new Error('No payload found in URL.');
  }

  if (payload.length > 1024 * 1024) {
    throw new Error('Payload too large (max 1MB).');
  }

  let jsonString: string;
  try {
    jsonString = Buffer.from(payload, 'base64').toString('utf-8');
  } catch {
    throw new Error('Add Device QR payload is not valid base64.');
  }

  if (jsonString.length > 1024 * 1024) {
    throw new Error('Decoded payload too large (max 1MB).');
  }

  return JSON.parse(jsonString);
};

export const tryDecodeAddDeviceQrPayloadFromMwpDeeplink = (
  url: string,
): unknown | null => {
  try {
    return decodeAddDeviceQrPayloadFromMwpDeeplink(url);
  } catch {
    return null;
  }
};

export const tryParseAddDeviceQrMwpDeeplink = (
  url: unknown,
): SessionRequest | null => {
  if (typeof url !== 'string') {
    return null;
  }

  const decoded = tryDecodeAddDeviceQrPayloadFromMwpDeeplink(url);
  if (!decoded) {
    return null;
  }

  return extractAddDeviceQrSessionRequest(decoded);
};
