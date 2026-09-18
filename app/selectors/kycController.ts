import { createSelector } from 'reselect';
import type { KycControllerState } from '@metamask/kyc-controller';
import { RootState } from '../reducers';

const selectKycControllerState = (state: RootState) =>
  state.engine?.backgroundState?.KycController as
    | KycControllerState
    | undefined;

export const selectKycSessionStatus = createSelector(
  selectKycControllerState,
  (kycControllerState) =>
    kycControllerState?.sessionStatus?.finalStatus ?? null,
);

export const selectKycSessionId = createSelector(
  selectKycControllerState,
  (kycControllerState) => kycControllerState?.sessionId ?? null,
);

export const selectKycSessionStatusMessage = createSelector(
  selectKycControllerState,
  (kycControllerState) =>
    kycControllerState?.sessionStatus?.statusMessage ?? null,
);
