import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';

import type { EntropySourceId } from '@metamask/keyring-api';

import type {
  QrSyncProvisioningMetadata,
  QrSyncProvisioningStatus,
  QrSyncSecretImportEntry,
  QrSyncConnectionStatus,
  QrSyncError,
  QrSyncOtpDisplay,
  QrSyncPhase,
} from './types';
import type { QrSyncSyncFlow } from './constants';
import { QrSyncProvisioningServiceImportSecretsToVaultAction } from './services/qr-sync-provisioning-service';

/** Runtime IDs written to persisted metadata after vault import (Phase B). */
export type QrSyncProvisioningEntryEnrichment =
  | { entropySource: EntropySourceId }
  | { accountAddress: string };

export const QR_SYNC_CONTROLLER_NAME = 'QrSyncController';

/** Serializable UI-safe state owned by the QR sync controller. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerState = {
  phase: QrSyncPhase;
  connectionStatus: QrSyncConnectionStatus;
  syncFlow: QrSyncSyncFlow | null;
  /** Ephemeral secrets until password import. Never persisted. */
  pendingSecretImports: QrSyncSecretImportEntry[] | null;
  /** Persisted provisioning plan (no secret material). */
  provisioningMetadata: QrSyncProvisioningMetadata | null;
  provisioningStatus: QrSyncProvisioningStatus | null;
  otp: QrSyncOtpDisplay | null;
  error: QrSyncError | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerImportRemainingSecretsAction = {
  type: `${typeof QR_SYNC_CONTROLLER_NAME}:importRemainingSecrets`;
  handler: () => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type QrSyncControllerEnrichProvisioningEntryAction = {
  type: `${typeof QR_SYNC_CONTROLLER_NAME}:enrichProvisioningEntry`;
  handler: (
    index: number,
    enrichment: QrSyncProvisioningEntryEnrichment,
  ) => void;
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
  | QrSyncControllerImportRemainingSecretsAction
  | QrSyncControllerEnrichProvisioningEntryAction
  | QrSyncControllerMarkProvisioningFailedAction
  | QrSyncControllerCompleteProvisioningAction;

/** Controller-local events emitted by the QR sync controller namespace. */
export type QrSyncControllerEvents = ControllerStateChangeEvent<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerState
>;

type AllowedActions = QrSyncProvisioningServiceImportSecretsToVaultAction;

export type QrSyncControllerMessenger = Messenger<
  typeof QR_SYNC_CONTROLLER_NAME,
  QrSyncControllerActions | AllowedActions,
  QrSyncControllerEvents
>;
