import { createSelector } from 'reselect';
import {
  createRequestSelector,
  type UserRegion,
  type Provider,
  type Country,
  type PaymentMethodsResponse,
  type RampsControllerState,
} from '@metamask/ramps-controller';
import { RootState } from '../../reducers';

type TokensResponse = NonNullable<RampsControllerState['tokens']>;

/**
 * Selects the RampsController state from Redux.
 * This is a simple selector (not memoized) since it only extracts
 * state without transformation. Child selectors handle memoization.
 */
export const selectRampsControllerState = (state: RootState) =>
  state.engine.backgroundState.RampsController;

/**
 * Selects the user's region from state.
 * Returns UserRegion | null (UserRegion contains country, state, and regionCode).
 */
export const selectUserRegion = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.userRegion ?? null,
);

/**
 * Selects the user's selected provider from state.
 */
export const selectSelectedProvider = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.selectedProvider ?? null,
);

/**
 * Selects the list of providers available for the current region.
 */
export const selectProviders = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.providers ?? [],
);

/**
 * Selects the tokens fetched for the current region and action.
 */
export const selectTokens = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.tokens ?? null,
);

/**
 * Selects the user's selected token from state.
 */
export const selectSelectedToken = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.selectedToken ?? null,
);

/**
 * Selects the list of countries available for ramp actions.
 */
export const selectCountries = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.countries ?? [],
);

/**
 * Selects the payment methods available for the current context.
 */
export const selectPaymentMethods = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.paymentMethods ?? [],
);

/**
 * Selects the user's selected payment method from state.
 */
export const selectSelectedPaymentMethod = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.selectedPaymentMethod ?? null,
);

/**
 * Selects whether user region is currently loading.
 */
export const selectUserRegionLoading = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.userRegionLoading ?? false,
);

/**
 * Selects the user region loading error, if any.
 */
export const selectUserRegionError = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.userRegionError ?? null,
);

/**
 * Selects whether countries are currently loading.
 */
export const selectCountriesLoading = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.countriesLoading ?? false,
);

/**
 * Selects the countries loading error, if any.
 */
export const selectCountriesError = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.countriesError ?? null,
);

/**
 * Selects whether providers are currently loading.
 */
export const selectProvidersLoading = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.providersLoading ?? false,
);

/**
 * Selects the providers loading error, if any.
 */
export const selectProvidersError = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.providersError ?? null,
);

/**
 * Selects whether tokens are currently loading.
 */
export const selectTokensLoading = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.tokensLoading ?? false,
);

/**
 * Selects the tokens loading error, if any.
 */
export const selectTokensError = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.tokensError ?? null,
);

/**
 * Selects whether payment methods are currently loading.
 */
export const selectPaymentMethodsLoading = createSelector(
  selectRampsControllerState,
  (rampsControllerState) =>
    rampsControllerState?.paymentMethodsLoading ?? false,
);

/**
 * Selects the payment methods loading error, if any.
 */
export const selectPaymentMethodsError = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.paymentMethodsError ?? null,
);

/**
 * Selects the user region request state.
 */
export const selectUserRegionRequest = createRequestSelector<
  RootState,
  UserRegion | null
>(selectRampsControllerState, 'init', []);

/**
 * Selects the countries request state.
 *
 * @returns Request selector for countries.
 */
export const selectCountriesRequest = createRequestSelector<
  RootState,
  Country[]
>(selectRampsControllerState, 'getCountries', []);

/**
 * Selects the tokens request state for a given region and action.
 *
 * @param region - The region code (e.g., "us", "fr", "us-ny").
 * @param action - The ramp action type ('buy' or 'sell').
 * @returns Request selector for tokens.
 */
export const selectTokensRequest = (
  region: string,
  action: 'buy' | 'sell' = 'buy',
) =>
  createRequestSelector<RootState, TokensResponse>(
    selectRampsControllerState,
    'getTokens',
    [region.toLowerCase().trim(), action],
  );

/**
 * Selects the providers request state for a given region.
 *
 * @param region - The region code (e.g., "us", "fr", "us-ny").
 * @param options - Optional filter options for the request cache key.
 * @returns Request selector for providers.
 */
export const selectProvidersRequest = (
  region: string,
  options?: {
    provider?: string | string[];
    crypto?: string | string[];
    fiat?: string | string[];
    payments?: string | string[];
  },
) =>
  createRequestSelector<RootState, { providers: Provider[] }>(
    selectRampsControllerState,
    'getProviders',
    [
      region.toLowerCase().trim(),
      options?.provider,
      options?.crypto,
      options?.fiat,
      options?.payments,
    ],
  );

/**
 * Selects the payment methods request state for a given context.
 *
 * @param region - The region code (e.g., "us", "fr", "us-ny").
 * @param fiat - The fiat currency code (e.g., "usd", "eur").
 * @param assetId - The asset ID in CAIP-19 format.
 * @param provider - The provider ID.
 * @returns Request selector for payment methods.
 */
export const selectPaymentMethodsRequest = (
  region: string,
  fiat: string,
  assetId: string,
  provider: string,
) =>
  createRequestSelector<RootState, PaymentMethodsResponse>(
    selectRampsControllerState,
    'getPaymentMethods',
    [region.toLowerCase().trim(), fiat.toLowerCase().trim(), assetId, provider],
  );
