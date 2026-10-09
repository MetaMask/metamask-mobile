import { createSelector } from 'reselect';
import {
  getDefaultKycControllerState,
  type KycControllerState,
  type KycProviderFlowStatus,
  type KycSessionStatus,
  type KycVendorDisclaimersAccepted,
} from '@metamask/kyc-controller';
import { RootState } from '../reducers';

/**
 * Fallback for when the KycController state is unavailable in Redux (for
 * example before Engine finishes adding its controllers). Computed once so
 * selectors keep a referentially stable default between store updates.
 */
const DEFAULT_KYC_CONTROLLER_STATE = getDefaultKycControllerState();

/**
 * Selects the KycController state from Redux.
 * This is a simple selector (not memoized) since it only extracts
 * state without transformation. Child selectors handle memoization.
 */
export const selectKycControllerState = (
  state: RootState,
): KycControllerState =>
  state.engine.backgroundState.KycController ?? DEFAULT_KYC_CONTROLLER_STATE;

/**
 * Selects the persisted UKYC session status, or `null` when no session has
 * been fetched for this profile.
 */
export const selectKycSessionStatus = createSelector(
  selectKycControllerState,
  (kycControllerState): KycSessionStatus | null =>
    kycControllerState?.sessionStatus ?? null,
);

/**
 * Selects the durable identity-provider flow outcome. Unlike the session's
 * `finalStatus`, this distinguishes a session that has not entered the
 * provider flow (`'not_started'`) from one the customer submitted,
 * abandoned, or failed.
 */
export const selectKycProviderFlowStatus = createSelector(
  selectKycControllerState,
  (kycControllerState): KycProviderFlowStatus =>
    kycControllerState?.providerFlowStatus ?? 'not_started',
);

/**
 * Selects the persisted vendor-disclaimer (T&C1) acceptance state, with fixed
 * `moonpay` and `iron` keys.
 */
export const selectKycVendorDisclaimersAccepted = createSelector(
  selectKycControllerState,
  (kycControllerState): KycVendorDisclaimersAccepted =>
    kycControllerState?.vendorDisclaimersAccepted ??
    DEFAULT_KYC_CONTROLLER_STATE.vendorDisclaimersAccepted,
);
