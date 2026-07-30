import { createSelector } from 'reselect';
import type { AccountWalletMnemonicPayload } from '@metamask/account-tree-controller';
import type { RootState } from '../../reducers';
import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
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
  (qrSyncState) => {
    const primaryWallet = qrSyncState.pendingPayload?.data.wallets.find(
      (w): w is AccountWalletMnemonicPayload => w.type === 'mnemonic',
    );
    if (!primaryWallet?.value) {
      return null;
    }
    try {
      return primaryWallet.value;
    } catch {
      return null;
    }
  },
);

export const selectQrSyncImportMnemonic = selectQrSyncPrimaryMnemonic;

export const selectQrSyncHasPendingSecrets = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) =>
    qrSyncState.pendingPayload !== null &&
    qrSyncState.pendingPayload?.data.wallets.length > 0,
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
    qrSyncState.pendingPayload !== null,
);

export const selectQrSyncNeedsProvisioning = createSelector(
  selectQrSyncControllerState,
  (qrSyncState) =>
    qrSyncState.provisioningStatus ===
      QrSyncProvisioningStatuses.SECRETS_IMPORTED &&
    qrSyncState.pendingPayload !== null,
);
