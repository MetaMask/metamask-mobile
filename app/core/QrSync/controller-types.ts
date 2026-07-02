import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

import type {
  QrSyncConnectionStatus,
  QrSyncError,
  QrSyncImportPlan,
  QrSyncOtpDisplay,
  QrSyncPhase,
} from './types';

export const QR_SYNC_CONTROLLER_NAME = 'QrSyncController';

/** Serializable UI-safe state owned by the QR sync controller. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerState = {
  phase: QrSyncPhase;
  connectionStatus: QrSyncConnectionStatus;
  importPlan: QrSyncImportPlan | null;
  otp: QrSyncOtpDisplay | null;
  error: QrSyncError | null;
};

/** Controller-local actions exposed by the QR sync controller namespace. */
export type QrSyncControllerActions = ControllerGetStateAction<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

/** Controller-local events emitted by the QR sync controller namespace. */
export type QrSyncControllerEvents = ControllerStateChangeEvent<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

/** Typed messenger used by the QR sync controller. */
export type QrSyncControllerMessenger = Messenger<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerActions | never,
  QrSyncControllerEvents | never
>;
