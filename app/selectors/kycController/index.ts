import { createSelector } from 'reselect';
import {
  getDefaultKycControllerState,
  type KycControllerState,
  type KycProviderFlowStatus,
  type KycSessionStatus,
  type KycVendor,
  type KycVendorDisclaimersAcceptance,
  type KycVendorSessionState,
} from '@metamask/kyc-controller';
import { RootState } from '../../reducers';

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

const selectVendorParam = (_state: RootState, vendor: KycVendor) => vendor;

/**
 * Selects a vendor's KYC session entry, or `undefined` when the vendor has
 * none.
 */
export const selectKycVendorSession = createSelector(
  [selectKycControllerState, selectVendorParam],
  (kycControllerState, vendor): KycVendorSessionState | undefined =>
    kycControllerState?.sessions?.[vendor],
);

/**
 * Selects a vendor's persisted UKYC session status, or `null` when no session
 * has been fetched for that vendor.
 */
export const selectKycSessionStatus = createSelector(
  selectKycVendorSession,
  (entry): KycSessionStatus | null => entry?.sessionStatus ?? null,
);

/**
 * Selects a vendor's durable identity-provider flow outcome. Unlike the
 * session's `finalStatus`, this distinguishes a session that has not entered
 * the provider flow (`'not_started'`) from one the customer submitted,
 * abandoned, or failed.
 */
export const selectKycProviderFlowStatus = createSelector(
  selectKycVendorSession,
  (entry): KycProviderFlowStatus => entry?.providerFlowStatus ?? 'not_started',
);

/**
 * Selects a vendor's T&C acceptance, whether or not it has been submitted yet.
 */
export const selectKycVendorDisclaimersAccepted = createSelector(
  selectKycVendorSession,
  (entry): KycVendorDisclaimersAcceptance | null =>
    entry?.vendorDisclaimersAccepted ?? null,
);
