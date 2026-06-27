import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

import type {
  QrSyncProvisioningMetadata,
  QrSyncProvisioningStatus,
  QrSyncSecretImportEntry,
  QrSyncConnectionStatus,
  QrSyncError,
  QrSyncOtpDisplay,
  QrSyncPhase,
} from './types';

export const QR_SYNC_CONTROLLER_NAME = 'QrSyncController';

/** Serializable UI-safe state owned by the QR sync controller. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerState = {
  phase: QrSyncPhase;
  connectionStatus: QrSyncConnectionStatus;
  /** Ephemeral secrets until password import. Never persisted. */
  pendingSecretImports: QrSyncSecretImportEntry[] | null;
  /** Persisted provisioning plan (no secret material). */
  provisioningMetadata: QrSyncProvisioningMetadata | null;
  provisioningStatus: QrSyncProvisioningStatus | null;
  otp: QrSyncOtpDisplay | null;
  error: QrSyncError | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerCompleteSecretImportAction = {
  type: `${typeof QR_SYNC_CONTROLLER_NAME}:completeSecretImport`;
  handler: (enrichedMetadata: QrSyncProvisioningMetadata) => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerMarkProvisioningFailedAction = {
  type: `${typeof QR_SYNC_CONTROLLER_NAME}:markProvisioningFailed`;
  handler: () => void;
};

export type QrSyncControllerGetStateAction = ControllerGetStateAction<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

/** Controller-local actions exposed by the QR sync controller namespace. */
export type QrSyncControllerActions =
  | QrSyncControllerGetStateAction
  | QrSyncControllerCompleteSecretImportAction
  | QrSyncControllerMarkProvisioningFailedAction;

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
