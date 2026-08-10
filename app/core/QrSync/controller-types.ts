import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

import type {
  AccountTreeControllerImportStateAction,
  AccountTreePayload,
  VersionedState,
} from '@metamask/account-tree-controller';

import type {
  QrSyncConnectionStatus,
  QrSyncError,
  QrSyncOtpDisplay,
  QrSyncPhase,
  QrSyncProvisioningStatus,
} from './types';
import type { QrSyncSyncFlow } from './constants';

export const QR_SYNC_CONTROLLER_NAME = 'QrSyncController';

/** Serializable UI-safe state owned by the QR sync controller. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerState = {
  phase: QrSyncPhase;
  connectionStatus: QrSyncConnectionStatus;
  syncFlow: QrSyncSyncFlow | null;
  /** Ephemeral account tree payload (secrets + metadata). Never persisted. */
  pendingPayload: VersionedState<AccountTreePayload> | null;
  provisioningStatus: QrSyncProvisioningStatus | null;
  otp: QrSyncOtpDisplay | null;
  error: QrSyncError | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerFinalizeVaultCreationAction = {
  type: `${typeof QR_SYNC_CONTROLLER_NAME}:finalizeVaultCreation`;
  handler: () => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerMarkProvisioningFailedAction = {
  type: `${typeof QR_SYNC_CONTROLLER_NAME}:markProvisioningFailed`;
  handler: () => void;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerCompleteProvisioningAction = {
  type: `${typeof QR_SYNC_CONTROLLER_NAME}:completeProvisioning`;
  handler: () => void;
};

export type QrSyncControllerGetStateAction = ControllerGetStateAction<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

/** Controller-local actions exposed by the QR sync controller namespace. */
export type QrSyncControllerActions =
  | QrSyncControllerGetStateAction
  | QrSyncControllerFinalizeVaultCreationAction
  | QrSyncControllerMarkProvisioningFailedAction
  | QrSyncControllerCompleteProvisioningAction;

/** Controller-local events emitted by the QR sync controller namespace. */
export type QrSyncControllerEvents = ControllerStateChangeEvent<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

type AllowedActions = AccountTreeControllerImportStateAction;

export type QrSyncControllerMessenger = Messenger<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerActions | AllowedActions,
  QrSyncControllerEvents
>;
