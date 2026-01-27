import { createSelector } from 'reselect';
import {
  createRequestSelector,
  type UserRegion,
  type Provider,
  type Country,
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
 * Selects the list of countries available for ramp actions.
 */
export const selectCountries = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.countries ?? [],
);

/**
 * Selects the user region request state.
 */
export const selectUserRegionRequest = createRequestSelector<
  RootState,
  UserRegion | null
>(selectRampsControllerState, 'updateUserRegion', []);

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
