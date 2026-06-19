import { base64ToBytes, bytesToString } from '@metamask/utils';
import { QrSyncActionTypes, QrSyncMessageVersion } from '../constants';
import {
  QrSyncData,
  QrSyncDataEntry,
  QrSyncError,
  QrSyncImportPlan,
  QrSyncImportPlanEntry,
  QrSyncMessage,
  QrSyncSecretMetadata,
  SyncDataType,
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

export type QrSyncNormalizationResult =
  | {
      valid: true;
      plan: QrSyncImportPlan;
    }
  | QrSyncValidationErrorResult;

const SYNC_DATA_TYPES: SyncDataType[] = ['MNEMONIC', 'PRIVATE_KEY'];

const buildValidationError = (
  code: QrSyncError['code'],
  message: string,
): QrSyncValidationErrorResult => ({
  valid: false,
  error: {
    code,
    message,
    retryable: false,
  },
});

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

export function isQrSyncSecretMetadata(
  data: unknown,
): data is QrSyncSecretMetadata {
  if (!isRecord(data)) {
    return false;
  }

  const { accountName, hiddenIndexes, isPrimary } =
    data as Partial<QrSyncSecretMetadata>;

  return (
    (accountName === undefined || typeof accountName === 'string') &&
    (hiddenIndexes === undefined ||
      (Array.isArray(hiddenIndexes) &&
        hiddenIndexes.every(
          (index) => typeof index === 'number' && Number.isInteger(index),
        ))) &&
    (isPrimary === undefined || typeof isPrimary === 'boolean')
  );
}

export function isQrSyncDataEntry(data: unknown): data is QrSyncDataEntry {
  if (!isRecord(data)) {
    return false;
  }

  const { value, type, metadata } = data as Partial<QrSyncDataEntry>;

  const isValidSyncDataType =
    typeof type === 'string' && SYNC_DATA_TYPES.includes(type as SyncDataType);

  return (
    typeof value === 'string' &&
    value.length > 0 &&
    isValidSyncDataType &&
    (metadata === undefined || isQrSyncSecretMetadata(metadata))
  );
}

export function isQrSyncData(data: unknown): data is QrSyncData {
  if (!isRecord(data)) {
    return false;
  }

  const { deadline, data: entries } = data as Partial<QrSyncData>;

  return (
    typeof deadline === 'number' &&
    Number.isFinite(deadline) &&
    Array.isArray(entries) &&
    entries.every(isQrSyncDataEntry)
  );
}

export function isQrSyncMessage<DataType = unknown>(
  data: unknown,
): data is QrSyncMessage<DataType> {
  if (!isRecord(data)) {
    return false;
  }

  const { type, version } = data as Partial<QrSyncMessage<DataType>>;

  return (
    typeof type === 'string' &&
    Object.values(QrSyncActionTypes).includes(type) &&
    version === QrSyncMessageVersion.V1
  );
}

export function isQrSyncSyncReadyMessage(
  data: unknown,
): data is QrSyncMessage<QrSyncData> {
  return (
    isQrSyncMessage<QrSyncData>(data) &&
    data.type === QrSyncActionTypes.SYNC_READY &&
    isQrSyncData(data.data)
  );
}

export function validateQrSyncData(
  data: QrSyncData,
  currentTimestamp = Date.now(),
): QrSyncValidationResult {
  if (data.data.length === 0) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload must include at least one import entry.',
    );
  }

  if (data.deadline <= currentTimestamp) {
    return buildValidationError(
      'SESSION_EXPIRED',
      'QR sync payload deadline has expired.',
    );
  }

  return validateQrSyncDataSemantics(data);
}

export function validateQrSyncDataSemantics(
  data: QrSyncData,
): QrSyncValidationResult {
  let primaryMnemonicCount = 0;

  for (const entry of data.data) {
    const isPrimary = entry.metadata?.isPrimary === true;
    const hiddenIndexes = entry.metadata?.hiddenIndexes;

    if (isPrimary && entry.type !== 'MNEMONIC') {
      return buildValidationError(
        'INVALID_PAYLOAD',
        'Only mnemonic entries may be marked as primary.',
      );
    }

    if (hiddenIndexes !== undefined && entry.type !== 'MNEMONIC') {
      return buildValidationError(
        'INVALID_PAYLOAD',
        'hiddenIndexes is only supported for mnemonic entries.',
      );
    }

    if (isPrimary) {
      primaryMnemonicCount += 1;
    }
  }

  if (primaryMnemonicCount > 1) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync payload may include at most one primary mnemonic.',
    );
  }

  return { valid: true };
}

export function normalizeQrSyncDataEntry(
  entry: QrSyncDataEntry,
  index: number,
): QrSyncImportPlanEntry {
  return {
    index,
    value: entry.value,
    type: entry.type,
    accountName: entry.metadata?.accountName ?? null,
    hiddenIndexes: entry.metadata?.hiddenIndexes ?? [],
    isPrimary: entry.metadata?.isPrimary === true,
  };
}

export function normalizeQrSyncData(data: QrSyncData): QrSyncImportPlan {
  return data.data.map((entry, index) => {
    const valueBytes = base64ToBytes(entry.value);
    const decodedValue = bytesToString(valueBytes);

    return normalizeQrSyncDataEntry({ ...entry, value: decodedValue }, index);
  });
}

export function validateAndNormalizeQrSyncData(
  data: QrSyncData,
  currentTimestamp = Date.now(),
): QrSyncNormalizationResult {
  const validationResult = validateQrSyncData(data, currentTimestamp);

  if (!validationResult.valid) {
    return validationResult;
  }

  return {
    valid: true,
    plan: normalizeQrSyncData(data),
  };
}

export function validateQrSyncSyncReadyMessage(
  data: unknown,
  currentTimestamp = Date.now(),
): QrSyncValidationResult {
  if (!isQrSyncMessage(data)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message does not match the expected envelope structure.',
    );
  }

  if (data.version !== QrSyncMessageVersion.V1) {
    return buildValidationError(
      'UNSUPPORTED_VERSION',
      `Unsupported QR sync message version: ${String(data.version)}`,
    );
  }

  if (data.type !== QrSyncActionTypes.SYNC_READY) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      `Expected QR sync message type "${QrSyncActionTypes.SYNC_READY}".`,
    );
  }

  if (!isQrSyncData(data.data)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message payload is malformed.',
    );
  }

  return validateQrSyncData(data.data, currentTimestamp);
}

export function validateAndNormalizeQrSyncSyncReadyMessage(
  data: unknown,
  currentTimestamp = Date.now(),
): QrSyncNormalizationResult {
  if (!isQrSyncMessage(data)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message does not match the expected envelope structure.',
    );
  }

  if (data.version !== QrSyncMessageVersion.V1) {
    return buildValidationError(
      'UNSUPPORTED_VERSION',
      `Unsupported QR sync message version: ${String(data.version)}`,
    );
  }

  if (data.type !== QrSyncActionTypes.SYNC_READY) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      `Expected QR sync message type "${QrSyncActionTypes.SYNC_READY}".`,
    );
  }

  if (!isQrSyncData(data.data)) {
    return buildValidationError(
      'INVALID_PAYLOAD',
      'QR sync message payload is malformed.',
    );
  }

  return validateAndNormalizeQrSyncData(data.data, currentTimestamp);
}
