import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import {
  selectKycPhase as coreSelectKycPhase,
  selectKycSumSub as coreSelectKycSumSub,
  selectIsKycRequiredForProduct as coreSelectIsKycRequiredForProduct,
  type KycControllerState,
  type KycProduct,
} from '@metamask/kyc-controller';

/**
 * Select the raw KycController state slice.
 */
export const selectKycControllerState = (
  state: RootState,
): KycControllerState => state.engine.backgroundState.KycController;

/**
 * Select the current identity-flow phase.
 */
export const selectKycPhase = createSelector(
  selectKycControllerState,
  (state) => coreSelectKycPhase(state),
);

/**
 * Select the timestamp at which the MoonPay terms were accepted, or `null`
 * when no acceptance is currently persisted.
 */
export const selectKycTermsAcceptedAt = createSelector(
  selectKycControllerState,
  (state) => state.termsAcceptedAt,
);

/**
 * Select the current status message.
 */
export const selectKycStatusMessage = createSelector(
  selectKycControllerState,
  (state) => state.statusMessage,
);

/**
 * Select the current error message, or `null`.
 */
export const selectKycError = createSelector(
  selectKycControllerState,
  (state) => state.error,
);

/**
 * Select the resolved ISO 3166-1 alpha-3 geolocation country.
 */
export const selectKycGeoCountry = createSelector(
  selectKycControllerState,
  (state) => state.geoCountry,
);

/**
 * Select the disclaimers fetched for the current country.
 */
export const selectKycDisclaimers = createSelector(
  selectKycControllerState,
  (state) => state.disclaimers,
);

/**
 * Select the error encountered while loading disclaimers, or `null`.
 */
export const selectKycDisclaimersError = createSelector(
  selectKycControllerState,
  (state) => state.disclaimersError,
);

/**
 * Select the SumSub document-verification sub-flow state.
 */
export const selectKycSumSub = createSelector(
  selectKycControllerState,
  (state) => coreSelectKycSumSub(state),
);

/**
 * Create a selector returning whether KYC is required for a given product.
 *
 * @param product - The consuming feature (`ramps` or `card`).
 * @returns A selector returning the cached requirement, or `undefined`.
 */
export const selectIsKycRequiredForProduct = (product: KycProduct) =>
  createSelector(selectKycControllerState, (state) =>
    coreSelectIsKycRequiredForProduct(product)(state),
  );
