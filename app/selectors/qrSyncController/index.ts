import { createSelector } from 'reselect';
import type { RootState } from '../../reducers';
import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
} from '../../core/QrSync/constants';
import type { QrSyncControllerState } from '../../core/QrSync/controller-types';

const selectQrSyncControllerState = (state: RootState): QrSyncControllerState =>
  state.engine.backgroundState.QrSyncController;

export const selectQrSyncPhase = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) => qrSyncState.phase,
);

export const selectQrSyncOtp = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) => qrSyncState.otp?.otp ?? null,
);

export const selectQrSyncError = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) => qrSyncState.error,
);

export const selectQrSyncPrimaryMnemonic = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) =>
    qrSyncState.pendingSecretImports?.find(
      (entry) => entry.type === QrSyncSecretTypes.MNEMONIC && entry.isPrimary,
    )?.value ?? null,
);

/** Primary mnemonic when flagged; otherwise first mnemonic (extension often omits isPrimary). */
export const selectQrSyncExistingUserImportMnemonic = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) => {
    const pendingSecretImports = qrSyncState.pendingSecretImports;
    if (!pendingSecretImports?.length) {
      return null;
    }

    const primaryMnemonic = pendingSecretImports.find(
      (entry) => entry.type === QrSyncSecretTypes.MNEMONIC && entry.isPrimary,
    )?.value;

    if (primaryMnemonic) {
      return primaryMnemonic;
    }

    return (
      pendingSecretImports.find(
        (entry) => entry.type === QrSyncSecretTypes.MNEMONIC,
      )?.value ?? null
    );
  },
);

export const selectQrSyncImportMnemonic = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) =>
    qrSyncState.pendingSecretImports?.find(
      (entry) => entry.type === QrSyncSecretTypes.MNEMONIC,
    )?.value ?? null,
);

export const selectQrSyncHasPendingSecrets = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) =>
    qrSyncState.pendingSecretImports !== null &&
    qrSyncState.pendingSecretImports.length > 0,
);

export const selectQrSyncIsBusy = createSelector(
  selectQrSyncPhase,
  (phase) =>
    phase === QrSyncPhases.INITIALIZING ||
    phase === QrSyncPhases.DISPLAYING_OTP,
);

export const selectQrSyncIsSessionActive = createSelector(
  selectQrSyncPhase,
  (phase) =>
    phase !== QrSyncPhases.IDLE &&
    phase !== QrSyncPhases.COMPLETED &&
    phase !== QrSyncPhases.FAILED,
);

export type QrSyncPresentation = 'instructions' | 'device-linked' | 'error';

/** Maps controller phase to the add-device screen body (OTP uses a separate sheet). */
export const selectQrSyncPresentation = createSelector(
  selectQrSyncPhase,
  selectQrSyncHasPendingSecrets,
  (phase, hasPendingSecrets): QrSyncPresentation => {
    switch (phase) {
      case QrSyncPhases.AWAITING_SYNC_READY:
      case QrSyncPhases.REVIEWING_IMPORT:
        return 'device-linked';
      case QrSyncPhases.COMPLETED:
        return hasPendingSecrets ? 'device-linked' : 'instructions';
      case QrSyncPhases.FAILED:
        return 'error';
      default:
        return 'instructions';
    }
  },
);

export const selectQrSyncShouldShowOtpSheet = createSelector(
  selectQrSyncPhase,
  (phase) => phase === QrSyncPhases.DISPLAYING_OTP,
);

export const selectQrSyncShouldNavigateToImport = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) =>
    qrSyncState.provisioningStatus ===
      QrSyncProvisioningStatuses.AWAITING_PASSWORD &&
    qrSyncState.pendingSecretImports !== null &&
    qrSyncState.pendingSecretImports.length > 0,
);

export const selectQrSyncNeedsProvisioning = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) =>
    qrSyncState.provisioningStatus ===
      QrSyncProvisioningStatuses.SECRETS_IMPORTED &&
    qrSyncState.provisioningMetadata !== null,
);
