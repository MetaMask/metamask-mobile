import { createSelector } from 'reselect';
import type { KycControllerState } from '@metamask/kyc-controller';
import { RootState } from '../reducers';

const selectKycControllerState = (state: RootState) =>
  state.engine?.backgroundState?.KycController as
    | KycControllerState
    | undefined;

export const selectKycUserStatus = createSelector(
  selectKycControllerState,
  (kycControllerState) => kycControllerState?.userStatus ?? null,
);

export const selectKycUserStatusSumsubSessionId = createSelector(
  selectKycControllerState,
  (kycControllerState) => kycControllerState?.userStatusSumsubSessionId ?? null,
);

export const selectKycUserStatusErrorCode = createSelector(
  selectKycControllerState,
  (kycControllerState) => kycControllerState?.userStatusErrorCode ?? null,
);
