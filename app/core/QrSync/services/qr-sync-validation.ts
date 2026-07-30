import type {
  AccountTreePayload,
  AccountWalletMnemonicPayload,
  VersionedState,
} from '@metamask/account-tree-controller';
import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import { base64ToBytes, bytesToString } from '@metamask/utils';

import { isUUID } from '../../SDKConnect/utils/isUUID';
import { QrSyncActionTypes, QrSyncMessageVersion } from '../constants';
import type {
  QrSyncConnectionRequest,
  QrSyncError,
  QrSyncSyncReadyMessage,
} from '../types';

const HANDSHAKE_CHANNEL_REGEX =
  /^handshake:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Scanned QR deeplink prefix for QR sync session bootstrap. */
export const QR_SYNC_MWP_DEEPLINK_PREFIX = 'metamask://connect/mwp';

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

const buildValidationError = (
  code: QrSyncError['code'],
  message: string,
): {
  valid: false;
  error: QrSyncError;
} => ({
  valid: false,
  error: {
    code,
    message,
  },
});

// --- QR scan / connection request ---

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
    const decoded = base64ToBytes(sessionRequest.publicKeyB64);
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
    sessionRequest.mode !== 'untrusted'
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
): data is QrSyncConnectionRequest | SessionRequest {
  if (isQrSyncSessionRequest(data)) {
    return true;
  }

  if (!isRecord(data) || !('sessionRequest' in data)) {
    return false;
  }

  return isQrSyncSessionRequest(data.sessionRequest);
}

const parseQrSyncScanPayloadJson = (rawQrData: string): unknown => {
  if (!rawQrData || typeof rawQrData !== 'string') {
    throw new Error('QR sync scan payload must be a non-empty string.');
  }

  const isQrSyncMwpDeeplink =
    typeof rawQrData === 'string' &&
    rawQrData.startsWith(QR_SYNC_MWP_DEEPLINK_PREFIX);
  if (!isQrSyncMwpDeeplink) {
    throw new Error('QR sync scan payload is not a valid MWP deeplink.');
  }

  const parsedUrl = new URL(rawQrData);
  const payload = parsedUrl.searchParams.get('p');

  if (!payload) {
    throw new Error('QR sync deeplink is missing the p parameter.');
  }

  try {
    const decodedPayload = decodeURIComponent(payload);
    const payloadBytes = base64ToBytes(decodedPayload);
    const payloadString = bytesToString(payloadBytes);
    return JSON.parse(payloadString);
  } catch {
    throw new Error('Invalid session request payload.');
  }
};

/**
 * Parses the raw QR scan payload into a validated QR sync connection request.
 *
 * Primary format: `metamask://connect/mwp?p=<base64-encoded-json>` with
 * optional `&c=1` when the `p` value is compressed. Accepts either a bare
 * `SessionRequest` or the wrapped `{ sessionRequest }` MWP connection shape.
 */
export function parseQrSyncConnectionRequest(
  rawQrData: string,
): QrSyncConnectionRequest {
  const parsed = parseQrSyncScanPayloadJson(rawQrData);

  if (!isQrSyncConnectionRequest(parsed)) {
    throw new Error(
      'QR sync scan payload does not contain a valid session request.',
    );
  }

  const sessionRequest = isQrSyncSessionRequest(parsed)
    ? parsed
    : parsed.sessionRequest;

  return { sessionRequest };
}

// --- Sync-ready payload parsing ---

const isAccountTreePayload = (
  data: unknown,
): data is VersionedState<AccountTreePayload> => {
  if (!isRecord(data)) {
    return false;
  }

  const candidate = data as Partial<VersionedState<AccountTreePayload>>;

  return Boolean(
    candidate.version === 1 &&
      candidate.data &&
      Array.isArray(candidate.data.wallets),
  );
};

/**
 * Validates sync-ready message envelope and AccountTreePayload.
 */
function validateSyncReadyMessage(
  message: Partial<QrSyncSyncReadyMessage>,
  currentTimestamp = Date.now(),
): {
  valid: boolean;
  error?: QrSyncError;
} {
  if (typeof message.deadline !== 'number' || Number.isNaN(message.deadline)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload deadline is not a valid number.',
    );
  }

  if (message.deadline <= currentTimestamp) {
    return buildValidationError(
      'SESSION_EXPIRED',
      'QR sync payload deadline has expired.',
    );
  }

  const payload = message.data;
  if (!isAccountTreePayload(payload)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message payload is malformed or uses an unsupported version.',
    );
  }

  if (payload.data.wallets.length === 0) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload must include at least one wallet.',
    );
  }

  return { valid: true };
}

/**
 * Validates that the payload includes a primary mnemonic wallet with a secret
 * value, required to create the vault during new-user onboarding.
 *
 * @param payload - The `AccountTreePayload` received from the extension.
 */
export function validateQrSyncPayloadForOnboarding(
  payload: VersionedState<AccountTreePayload> | undefined,
): {
  valid: boolean;
  error?: QrSyncError;
} {
  const primaryMnemonic = payload?.data.wallets.find(
    (w): w is AccountWalletMnemonicPayload => w.type === 'mnemonic',
  );

  if (!primaryMnemonic?.value) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload must include a primary mnemonic for new-user onboarding.',
    );
  }

  return { valid: true };
}

/**
 * Validates a `sync-ready` wire message and returns the {@link AccountTreePayload}.
 */
export function parseQrSyncSyncReadyMessage(
  data: unknown,
  currentTimestamp = Date.now(),
): {
  valid: boolean;
  error?: QrSyncError;
  pendingPayload?: VersionedState<AccountTreePayload>;
} {
  if (!isRecord(data)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message does not match the expected envelope structure.',
    );
  }

  const message = data as Partial<QrSyncSyncReadyMessage>;

  if (
    typeof message.type !== 'string' ||
    message.version !== QrSyncMessageVersion.V1
  ) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message does not match the expected envelope structure.',
    );
  }

  if (message.type !== QrSyncActionTypes.SYNC_READY) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      `Expected QR sync message type "${QrSyncActionTypes.SYNC_READY}".`,
    );
  }

  const messageValidation = validateSyncReadyMessage(message, currentTimestamp);

  if (!messageValidation.valid) {
    return messageValidation;
  }

  return {
    valid: true,
    pendingPayload:
      message.data as unknown as VersionedState<AccountTreePayload>,
  };
}
