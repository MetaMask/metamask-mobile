import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import { base64ToBytes, bytesToBase64, bytesToString } from '@metamask/utils';

import { isUUID } from '../../SDKConnect/utils/isUUID';
import { decompressPayloadB64 } from '../../SDKConnectV2/utils/compression-utils';
import {
  QrSyncActionTypes,
  QrSyncMessageVersion,
  QrSyncSecretTypes,
} from '../constants';
import type {
  QrSyncAccountGroup,
  QrSyncConnectionRequest,
  QrSyncError,
  QrSyncProvisioningEntry,
  QrSyncProvisioningMetadata,
  QrSyncReadyData,
  QrSyncReadyMnemonicData,
  QrSyncReadyPrivateKeyData,
  QrSyncSecretImportEntry,
  QrSyncSyncReadyMessage,
} from '../types';

interface QrSyncValidationSuccessResult {
  valid: true;
}
interface QrSyncValidationErrorResult {
  valid: false;
  error: QrSyncError;
}
type QrSyncValidationResult =
  | QrSyncValidationSuccessResult
  | QrSyncValidationErrorResult;

export type QrSyncSyncReadyParseResult =
  | {
      valid: true;
      pendingSecretImports: QrSyncSecretImportEntry[];
      provisioningMetadata: QrSyncProvisioningMetadata;
    }
  | QrSyncValidationErrorResult;

const HANDSHAKE_CHANNEL_REGEX =
  /^handshake:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Scanned QR deeplink prefix for QR sync session bootstrap. */
export const QR_SYNC_MWP_DEEPLINK_PREFIX = 'metamask://connect/mwp';

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

const buildValidationError = (
  code: QrSyncError['code'],
  message: string,
): QrSyncValidationErrorResult => ({
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

const decodeMaybeBase64Json = (raw: string): string => {
  try {
    const valueBytes = base64ToBytes(raw);
    const decoded = bytesToString(valueBytes);
    if (bytesToBase64(valueBytes) === raw) {
      return decoded;
    }
  } catch {
    // Fall through and return the raw string below.
  }

  return raw;
};

const extractMwpDeeplinkPayload = (deeplink: string): string => {
  const parsedUrl = new URL(deeplink);
  const payload = parsedUrl.searchParams.get('p');

  if (!payload) {
    throw new Error('QR sync deeplink is missing the p parameter.');
  }

  const compressionFlag = parsedUrl.searchParams.get('c');
  const rawPayload =
    compressionFlag === '1' ? decompressPayloadB64(payload) : payload;

  return decodeMaybeBase64Json(rawPayload);
};

/** Returns true when the scanned value is an MWP connect deeplink. */
export function isQrSyncMwpDeeplink(data: unknown): data is string {
  return (
    typeof data === 'string' && data.startsWith(QR_SYNC_MWP_DEEPLINK_PREFIX)
  );
}

const parseQrSyncScanPayloadJson = (rawQrData: string): unknown => {
  if (!rawQrData || typeof rawQrData !== 'string') {
    throw new Error('QR sync scan payload must be a non-empty string.');
  }

  if (!isQrSyncMwpDeeplink(rawQrData)) {
    throw new Error('QR sync scan payload is not a valid MWP deeplink.');
  }

  try {
    const jsonString = extractMwpDeeplinkPayload(rawQrData);
    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('QR sync scan payload is not valid JSON.');
  }
};

/**
 * Parses the raw QR scan payload into a validated QR sync connection request.
 *
 * Primary format: `metamask://connect/mwp?p=<base64-encoded-json>` with
 * optional `&c=1` when the `p` value is compressed.
 */
export function parseQrSyncConnectionRequest(
  rawQrData: string,
): QrSyncConnectionRequest {
  const parsed = parseQrSyncScanPayloadJson(rawQrData);

  if (!isQrSyncSessionRequest(parsed)) {
    throw new Error(
      'QR sync scan payload does not contain a valid session request.',
    );
  }

  return { sessionRequest: parsed };
}

// --- Sync-ready payload parsing ---

const decodeSecretValue = (value: string): string => {
  try {
    return bytesToString(base64ToBytes(value));
  } catch {
    return value;
  }
};

const isQrSyncAccountGroup = (data: unknown): data is QrSyncAccountGroup => {
  if (!isRecord(data)) {
    return false;
  }

  const { groupIndex, name, pinned, hidden } =
    data as Partial<QrSyncAccountGroup>;

  return (
    typeof groupIndex === 'number' &&
    Number.isInteger(groupIndex) &&
    groupIndex >= 0 &&
    typeof name === 'string' &&
    name.length > 0 &&
    (pinned === undefined || typeof pinned === 'boolean') &&
    (hidden === undefined || typeof hidden === 'boolean')
  );
};

const isQrSyncReadyMnemonicData = (
  data: unknown,
): data is QrSyncReadyMnemonicData => {
  if (!isRecord(data)) {
    return false;
  }

  const entry = data as Partial<QrSyncReadyMnemonicData>;

  if (
    entry.type !== QrSyncSecretTypes.MNEMONIC ||
    typeof entry.mnemonic !== 'string' ||
    entry.mnemonic.length === 0
  ) {
    return false;
  }

  if (
    entry.name !== undefined &&
    (typeof entry.name !== 'string' || entry.name.length === 0)
  ) {
    return false;
  }

  if (
    entry.groups !== undefined &&
    (!Array.isArray(entry.groups) || !entry.groups.every(isQrSyncAccountGroup))
  ) {
    return false;
  }

  if (entry.isPrimary !== undefined && typeof entry.isPrimary !== 'boolean') {
    return false;
  }

  return true;
};

const isQrSyncReadyPrivateKeyData = (
  data: unknown,
): data is QrSyncReadyPrivateKeyData => {
  if (!isRecord(data)) {
    return false;
  }

  const entry = data as Partial<QrSyncReadyPrivateKeyData>;

  return (
    entry.type === QrSyncSecretTypes.PRIVATE_KEY &&
    typeof entry.privateKey === 'string' &&
    entry.privateKey.length > 0 &&
    typeof entry.name === 'string' &&
    entry.name.length > 0 &&
    (entry.pinned === undefined || typeof entry.pinned === 'boolean') &&
    (entry.hidden === undefined || typeof entry.hidden === 'boolean')
  );
};

const isQrSyncReadyData = (data: unknown): data is QrSyncReadyData =>
  isQrSyncReadyMnemonicData(data) || isQrSyncReadyPrivateKeyData(data);

/**
 * Validates sync-ready import entries and deadline.
 */
function validateSyncReadyMessage(
  message: Partial<QrSyncSyncReadyMessage>,
  currentTimestamp = Date.now(),
): QrSyncValidationResult {
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

  if (!Array.isArray(message.data)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message payload is malformed.',
    );
  }

  if (message.data.length === 0) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload must include at least one secret import.',
    );
  }

  if (!message.data.every(isQrSyncReadyData)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload contains a malformed import entry.',
    );
  }

  const primaryMnemonics = message.data.filter(
    (entry) =>
      entry.type === QrSyncSecretTypes.MNEMONIC && entry.isPrimary === true,
  );

  if (primaryMnemonics.length > 1) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload may include at most one primary mnemonic.',
    );
  }

  return { valid: true };
}

const toControllerState = (
  entries: QrSyncReadyData[],
  version: QrSyncMessageVersion,
): {
  pendingSecretImports: QrSyncSecretImportEntry[];
  provisioningMetadata: QrSyncProvisioningMetadata;
} => {
  const { pendingSecretImports, provisioningEntries } = entries.reduce<{
    pendingSecretImports: QrSyncSecretImportEntry[];
    provisioningEntries: QrSyncProvisioningEntry[];
  }>(
    (state, entry, index) => {
      if (entry.type === QrSyncSecretTypes.MNEMONIC) {
        state.pendingSecretImports.push({
          index,
          type: entry.type,
          value: decodeSecretValue(entry.mnemonic),
          isPrimary: Boolean(entry.isPrimary),
        });
        state.provisioningEntries.push({
          index,
          type: entry.type,
          isPrimary: Boolean(entry.isPrimary),
          name: entry.name,
          groups: entry.groups?.map((group) => ({
            groupIndex: group.groupIndex,
            name: group.name,
            ...(group.pinned !== undefined ? { pinned: group.pinned } : {}),
            ...(group.hidden !== undefined ? { hidden: group.hidden } : {}),
          })),
        });
        return state;
      }

      state.pendingSecretImports.push({
        index,
        type: entry.type,
        value: decodeSecretValue(entry.privateKey),
      });
      state.provisioningEntries.push({
        index,
        type: entry.type,
        name: entry.name,
        ...(entry.pinned !== undefined ? { pinned: entry.pinned } : {}),
        ...(entry.hidden !== undefined ? { hidden: entry.hidden } : {}),
      });
      return state;
    },
    { pendingSecretImports: [], provisioningEntries: [] },
  );

  return {
    pendingSecretImports,
    provisioningMetadata: {
      version,
      entries: provisioningEntries,
    },
  };
};

/**
 * Validates a `sync-ready` wire message and maps it to controller state shapes.
 */
export function parseQrSyncSyncReadyMessage(
  data: unknown,
  currentTimestamp = Date.now(),
): QrSyncSyncReadyParseResult {
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

  const { pendingSecretImports, provisioningMetadata } = toControllerState(
    message.data as QrSyncReadyData[],
    message.version as QrSyncMessageVersion,
  );

  return {
    valid: true,
    pendingSecretImports,
    provisioningMetadata,
  };
}

/** Validates that the pending secret imports include a primary mnemonic. */
export function validateQrSyncSecretImportsForOnboarding(
  secretImports: QrSyncSecretImportEntry[] | undefined,
): QrSyncValidationResult {
  const hasPrimaryMnemonic = secretImports?.some(
    (entry) =>
      entry.type === QrSyncSecretTypes.MNEMONIC && entry.isPrimary === true,
  );

  if (!hasPrimaryMnemonic) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload must include a primary mnemonic when onboarding is not completed.',
    );
  }

  return { valid: true };
}
