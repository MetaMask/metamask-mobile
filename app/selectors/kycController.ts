import { createSelector } from 'reselect';
import {
  selectKycSessionStatus as coreSelectKycSessionStatus,
  type KycSessionStatus,
} from '@metamask/kyc-controller';
import { RootState } from '../reducers';

const selectKycControllerState = (state: RootState) =>
  state.engine.backgroundState.KycController;

/**
 * Selects the latest UKYC session status, or `null` when there is no session.
 */
export const selectKycSessionStatus = createSelector(
  selectKycControllerState,
  (kycControllerState): KycSessionStatus | null =>
    kycControllerState
      ? (coreSelectKycSessionStatus(kycControllerState) ?? null)
      : null,
);

/**
 * Selects the session's `finalStatus` (vendor-side outcome), or `null` when
 * there is no session.
 */
export const selectKycSessionFinalStatus = createSelector(
  selectKycSessionStatus,
  (sessionStatus): string | null => sessionStatus?.finalStatus ?? null,
);

/**
 * Selects the session's `kycStatus` (relay-side decision), or `null` when
 * there is no session.
 */
export const selectKycSessionKycStatus = createSelector(
  selectKycSessionStatus,
  (sessionStatus): string | null => sessionStatus?.kycStatus ?? null,
);
