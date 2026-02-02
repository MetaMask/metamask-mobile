import { createSelector } from 'reselect';
import {
  createRequestSelector,
  type UserRegion,
  type Provider,
  type Country,
  type RampsControllerState,
  type QuotesResponse,
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
 * Selects the user's preferred provider from state.
 */
export const selectPreferredProvider = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.preferredProvider ?? null,
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
 * Selects the user region request state.
 */
export const selectUserRegionRequest = createRequestSelector<
  RootState,
  UserRegion | null
>(selectRampsControllerState, 'updateUserRegion', []);

/**
 * Selects the countries request state for a given action.
 *
 * @param action - The ramp action type ('buy' or 'sell').
 * @returns Request selector for countries.
 */
export const selectCountriesRequest = (action: 'buy' | 'sell' = 'buy') =>
  createRequestSelector<RootState, Country[]>(
    selectRampsControllerState,
    'getCountries',
    [action],
  );

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
 * Selects the quotes from state.
 */
export const selectQuotes = createSelector(
  selectRampsControllerState,
  (rampsControllerState) => rampsControllerState?.quotes ?? null,
);

/**
 * Selects the quotes request state for given parameters.
 * Note: The cache key includes region, fiat, assetId, amount, walletAddress, paymentMethods, provider, redirectUrl, and action.
 *
 * @param params - The parameters used to fetch quotes.
 * @param params.region - The region code (e.g., "us", "fr", "us-ny").
 * @param params.fiat - The fiat currency code (e.g., "usd", "eur").
 * @param params.assetId - CAIP-19 cryptocurrency identifier.
 * @param params.amount - The amount for the quote.
 * @param params.walletAddress - The destination wallet address.
 * @param params.paymentMethods - Array of payment method IDs.
 * @param params.provider - Optional provider ID to filter quotes.
 * @param params.redirectUrl - Optional redirect URL after order completion.
 * @param params.action - The ramp action type ('buy' or 'sell').
 * @returns Request selector for quotes.
 */
export const selectQuotesRequest = (params: {
  region: string;
  fiat: string;
  assetId: string;
  amount: number;
  walletAddress: string;
  paymentMethods: string[];
  provider?: string;
  redirectUrl?: string;
  action?: 'buy' | 'sell';
}) =>
  createRequestSelector<RootState, QuotesResponse>(
    selectRampsControllerState,
    'getQuotes',
    [
      params.region.toLowerCase().trim(),
      params.fiat.toLowerCase().trim(),
      params.assetId,
      params.amount,
      params.walletAddress,
      [...params.paymentMethods].sort().join(','),
      params.provider,
      params.redirectUrl,
      params.action ?? 'buy',
    ],
  );
