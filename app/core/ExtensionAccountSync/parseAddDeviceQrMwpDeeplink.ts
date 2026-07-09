import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import { isQrSyncSessionRequest } from '../QrSync/services/qr-sync-validation';

/**
 * Add Device QR format (aligned with extension QR sync):
 * `metamask://connect/mwp?p=<base64-encoded-session-request-json>`
 *
 * The `p` query param is base64(JSON), where JSON is either a bare
 * `SessionRequest` or `{ sessionRequest: SessionRequest }`.
 */
export const isAddDeviceQrSessionRequest = isQrSyncSessionRequest;

export const extractAddDeviceQrSessionRequest = (
  data: unknown,
): SessionRequest | null => {
  if (isAddDeviceQrSessionRequest(data)) {
    return data;
  }

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !('sessionRequest' in data)
  ) {
    return null;
  }

  return isAddDeviceQrSessionRequest(
    (data as { sessionRequest: unknown }).sessionRequest,
  )
    ? (data as { sessionRequest: SessionRequest }).sessionRequest
    : null;
};

export const extractAddDeviceQrSessionExpiresAt = (
  data: unknown,
): number | null => {
  const sessionRequest = extractAddDeviceQrSessionRequest(data);
  if (sessionRequest) {
    return sessionRequest.expiresAt;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  if (typeof (data as { expiresAt?: unknown }).expiresAt === 'number') {
    const expiresAt = (data as { expiresAt: number }).expiresAt;
    if (!Number.isNaN(expiresAt)) {
      return expiresAt;
    }
  }

  if (
    'sessionRequest' in data &&
    data.sessionRequest &&
    typeof data.sessionRequest === 'object' &&
    !Array.isArray(data.sessionRequest)
  ) {
    const expiresAt = (data.sessionRequest as { expiresAt?: unknown })
      .expiresAt;
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
