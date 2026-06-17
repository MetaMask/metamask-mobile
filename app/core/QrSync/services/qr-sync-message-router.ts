import { QrSyncActionTypes, QrSyncMessageVersion } from '../constants';
import type {
  QrSyncError,
  QrSyncImportPlan,
  QrSyncServiceEvent,
} from '../types';
import { validateAndNormalizeQrSyncSyncReadyMessage } from './qr-sync-payload-validator';

export interface QrSyncRoutedMessageResult {
  handled: boolean;
  event: QrSyncServiceEvent;
  importPlan?: QrSyncImportPlan;
}

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

const isQrSyncErrorPayload = (data: unknown): data is QrSyncError => {
  if (!isRecord(data)) {
    return false;
  }

  return (
    typeof data.code === 'string' &&
    typeof data.message === 'string' &&
    typeof data.retryable === 'boolean'
  );
};

const toInvalidPayloadEvent = (message: string) =>
  ({
    handled: false,
    event: {
      type: QrSyncActionTypes.SYNC_ERROR,
      data: {
        code: 'INVALID_PAYLOAD',
        message,
        retryable: false,
      },
    },
  }) satisfies QrSyncRoutedMessageResult;

/** Routes one decrypted incoming peer message into controller-consumable output. */
export function routeIncomingQrSyncMessage(
  rawMessage: unknown,
  currentTimestamp = Date.now(),
): QrSyncRoutedMessageResult {
  if (!isRecord(rawMessage)) {
    return toInvalidPayloadEvent(
      'QR sync message does not match the expected envelope structure.',
    );
  }

  const message = rawMessage as Record<string, unknown>;

  if (message.version !== QrSyncMessageVersion.V1) {
    return toInvalidPayloadEvent(
      `Unsupported QR sync message version: ${String(message.version)}`,
    );
  }

  switch (message.type) {
    case QrSyncActionTypes.SYNC_READY: {
      const normalizedResult = validateAndNormalizeQrSyncSyncReadyMessage(
        rawMessage,
        currentTimestamp,
      );

      if (!normalizedResult.valid) {
        return {
          handled: false,
          event: {
            type: QrSyncActionTypes.SYNC_ERROR,
            data: normalizedResult.error,
          },
        };
      }

      return {
        handled: true,
        importPlan: normalizedResult.plan,
        event: {
          type: QrSyncActionTypes.SYNC_READY,
          data: normalizedResult.review,
        },
      };
    }

    case QrSyncActionTypes.SYNC_COMPLETED:
      return {
        handled: true,
        event: {
          type: QrSyncActionTypes.SYNC_COMPLETED,
        },
      };

    case QrSyncActionTypes.SYNC_ERROR:
      if (!isQrSyncErrorPayload(message.data)) {
        return toInvalidPayloadEvent('QR sync error payload is malformed.');
      }

      return {
        handled: true,
        event: {
          type: QrSyncActionTypes.SYNC_ERROR,
          data: message.data,
        },
      };

    default:
      return toInvalidPayloadEvent(
        `Unsupported incoming QR sync message type: ${String(message.type)}`,
      );
  }
}
