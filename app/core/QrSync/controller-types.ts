import type {
  ControllerGetStateAction,
  ControllerStateChangedEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

import type {
  QrSyncConnectionStatus,
  QrSyncErrorCode,
  QrSyncPhase,
  SyncDataType,
} from './types';

export const QR_SYNC_CONTROLLER_NAME = 'QrSyncController';

/** JSON-safe error shape stored in controller state. */
export interface QrSyncControllerErrorState {
  code: QrSyncErrorCode;
  message: string;
  retryable: boolean;
}

/** JSON-safe OTP display shape stored in controller state. */
export interface QrSyncControllerOtpState {
  otp: string;
  deadline: number;
}

/** JSON-safe review entry exposed to UI from controller state. */
export interface QrSyncControllerReviewItemState {
  index: number;
  type: SyncDataType;
  accountName: string | null;
  hiddenIndexes: number[];
  isPrimary: boolean;
}

/** JSON-safe aggregate review summary exposed to UI from controller state. */
export interface QrSyncControllerReviewSummaryState {
  entryCount: number;
  mnemonicCount: number;
  privateKeyCount: number;
  hasPrimaryMnemonic: boolean;
}

/** JSON-safe sanitized review model stored in controller state. */
export interface QrSyncControllerReviewState {
  deadline: number;
  entries: QrSyncControllerReviewItemState[];
  summary: QrSyncControllerReviewSummaryState;
}

/** Serializable UI-safe state owned by the QR sync controller. */
export interface QrSyncControllerState {
  phase: QrSyncPhase;
  connectionStatus: QrSyncConnectionStatus;
  review: QrSyncControllerReviewState | null;
  otp: QrSyncControllerOtpState | null;
  error: QrSyncControllerErrorState | null;
}

/** Controller-local actions exposed by the QR sync controller namespace. */
export type QrSyncControllerActions = ControllerGetStateAction<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

/** Controller-local events emitted by the QR sync controller namespace. */
export type QrSyncControllerEvents = ControllerStateChangedEvent<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

/** Typed messenger used by the QR sync controller. */
export type QrSyncControllerMessenger = Messenger<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerActions,
  QrSyncControllerEvents
>;
