import { createSelector } from 'reselect';
import type { KycUserStatus } from '@metamask/kyc-controller';
import { RootState } from '../reducers';

export const selectKycControllerState = (state: RootState) =>
  state.engine.backgroundState.KycController;

/**
 * Selects the user-keyed KYC status from `GET /kyc/status`.
 *
 * @returns The simplified status, or `null` before the first successful refresh.
 */
export const selectKycUserStatus = createSelector(
  selectKycControllerState,
  (kycControllerState): KycUserStatus | null =>
    kycControllerState?.userStatus ?? null,
);
