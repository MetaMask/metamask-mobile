import { QrSyncActionTypes, QrSyncMessageVersion } from '../constants';
import type {
  QrSyncProvisioningMetadata,
  QrSyncSecretImportEntry,
  QrSyncError,
  QrSyncServiceEvent,
  QrSyncSyncCancelledEvent,
  QrSyncSyncCompletedEvent,
  QrSyncSyncErrorEvent,
  QrSyncSyncReadyEvent,
} from '../types';
import { parseQrSyncSyncReadyMessage } from './qr-sync-validation';

export interface QrSyncRoutedMessageResult {
  handled: boolean;
  event: QrSyncServiceEvent;
  pendingSecretImports?: QrSyncSecretImportEntry[];
  provisioningMetadata?: QrSyncProvisioningMetadata;
}

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === 'object' && data !== null && !Array.isArray(data);

const isQrSyncErrorPayload = (data: unknown): data is QrSyncError => {
  if (!isRecord(data)) {
    return false;
  }

  return typeof data.code === 'string' && typeof data.message === 'string';
};

const toInvalidPayloadEvent = (message: string): QrSyncRoutedMessageResult => ({
  handled: false,
  event: {
    type: QrSyncActionTypes.SYNC_ERROR,
    data: {
      code: 'INVALID_PAYLOAD',
      message,
    },
  } satisfies QrSyncSyncErrorEvent,
});

/** Routes one decrypted incoming peer message into controller-consumable output. */
export function routeIncomingQrSyncMessage(
  rawMessage: unknown,
): QrSyncRoutedMessageResult | undefined {
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
      const parseResult = parseQrSyncSyncReadyMessage(rawMessage);

      if (!parseResult.valid) {
        return {
          handled: false,
          event: {
            type: QrSyncActionTypes.SYNC_ERROR,
            data: parseResult.error ?? {
              code: 'UNKNOWN_ERROR',
              message: 'Unknown error',
            },
          } satisfies QrSyncSyncErrorEvent,
        };
      }

      return {
        handled: true,
        pendingSecretImports: parseResult.pendingSecretImports,
        provisioningMetadata: parseResult.provisioningMetadata,
        event: {
          type: QrSyncActionTypes.SYNC_READY,
        } satisfies QrSyncSyncReadyEvent,
      };
    }

    case QrSyncActionTypes.SYNC_COMPLETED:
      return {
        handled: true,
        event: {
          type: QrSyncActionTypes.SYNC_COMPLETED,
        } satisfies QrSyncSyncCompletedEvent,
      };

    case QrSyncActionTypes.SYNC_CANCEL:
      return {
        handled: true,
        event: {
          type: QrSyncActionTypes.SYNC_CANCEL,
        } satisfies QrSyncSyncCancelledEvent,
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
        } satisfies QrSyncSyncErrorEvent,
      };

    case QrSyncActionTypes.INIT_SYNC_SESSION:
      return undefined;

    default:
      return toInvalidPayloadEvent(
        `Unsupported incoming QR sync message type: ${String(message.type)}`,
      );
  }
}
