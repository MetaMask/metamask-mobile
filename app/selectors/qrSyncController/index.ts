import { createSelector } from 'reselect';
import type { RootState } from '../../reducers';
import { QrSyncPhases } from '../../core/QrSync/constants';
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
    qrSyncState.importPlan?.find(
      (entry) => entry.type === 'MNEMONIC' && entry.isPrimary,
    )?.value ?? null,
);

export const selectQrSyncIsBusy = createSelector(
  selectQrSyncPhase,
  (phase) =>
    phase === QrSyncPhases.INITIALIZING ||
    phase === QrSyncPhases.DISPLAYING_OTP ||
    phase === QrSyncPhases.CONNECTED,
);

export const selectQrSyncIsSessionActive = createSelector(
  selectQrSyncPhase,
  (phase) =>
    phase !== QrSyncPhases.IDLE &&
    phase !== QrSyncPhases.COMPLETED &&
    phase !== QrSyncPhases.FAILED &&
    phase !== QrSyncPhases.PEER_CANCELLED,
);

export type QrSyncPresentation = 'instructions' | 'device-linked' | 'error';

/** Maps controller phase to the add-device screen body (OTP uses a separate sheet). */
export const selectQrSyncPresentation = createSelector(
  selectQrSyncPhase,
  (phase): QrSyncPresentation => {
    switch (phase) {
      case QrSyncPhases.AWAITING_SYNC_READY:
      case QrSyncPhases.REVIEWING_IMPORT:
      case QrSyncPhases.PEER_CANCELLED:
        return 'device-linked';
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
