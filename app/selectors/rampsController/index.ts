import { createSelector } from 'reselect';
import {
  createRequestSelector,
  type UserRegion,
  type Provider,
  type Country,
  type PaymentMethodsResponse,
  type PaymentMethod,
  type QuotesResponse,
} from '@metamask/ramps-controller';
import { RootState } from '../../reducers';

/**
 * Generic type for resource state that bundles data with loading/error states.
 */
interface ResourceState<TData, TSelected = null> {
  data: TData;
  selected: TSelected;
  isLoading: boolean;
  error: string | null;
}

/**
 * Token type from the ramps controller.
 */
interface RampsToken {
  assetId: string;
  chainId: string;
  name: string;
  symbol: string;
  decimals: number;
  iconUrl?: string;
  tokenSupported: boolean;
}

/**
 * Tokens response type from the ramps controller.
 */
interface TokensResponse {
  topTokens: RampsToken[];
  allTokens: RampsToken[];
}

/**
 * Selects the RampsController state from Redux.
 * This is a simple selector (not memoized) since it only extracts
 * state without transformation. Child selectors handle memoization.
 */
export const selectRampsControllerState = (state: RootState) =>
  state.engine.backgroundState.RampsController;

/**
 * Default resource state for when the controller state is unavailable.
 */
const createDefaultResourceState = <TData, TSelected = null>(
  data: TData,
  selected: TSelected = null as TSelected,
): ResourceState<TData, TSelected> => ({
  data,
  selected,
  isLoading: false,
  error: null,
});

/**
 * Selects the user region resource state (data, isLoading, error).
 * Note: Type assertions needed until core package is rebuilt in monorepo.
 */
export const selectUserRegion = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<UserRegion | null> =>
    (rampsControllerState?.userRegion as unknown as ResourceState<UserRegion | null>) ??
    createDefaultResourceState<UserRegion | null>(null),
);

/**
 * Selects the countries resource state (data, isLoading, error).
 */
export const selectCountries = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<Country[]> =>
    (rampsControllerState?.countries as unknown as ResourceState<Country[]>) ??
    createDefaultResourceState<Country[]>([]),
);

/**
 * Selects the user's selected provider from state.
 */
export const selectSelectedProvider = createSelector(
  selectRampsControllerState,
  (rampsControllerState) =>
    (rampsControllerState as Record<string, unknown>)?.selectedProvider ?? null,
);

/**
 * Selects the providers resource state (data, selected, isLoading, error).
 */
export const selectProviders = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<Provider[], Provider | null> =>
    (rampsControllerState?.providers as unknown as ResourceState<
      Provider[],
      Provider | null
    >) ?? createDefaultResourceState<Provider[], Provider | null>([], null),
);

/**
 * Selects the tokens resource state (data, selected, isLoading, error).
 */
export const selectTokens = createSelector(
  selectRampsControllerState,
  (
    rampsControllerState,
  ): ResourceState<TokensResponse | null, RampsToken | null> =>
    (rampsControllerState?.tokens as unknown as ResourceState<
      TokensResponse | null,
      RampsToken | null
    >) ??
    createDefaultResourceState<TokensResponse | null, RampsToken | null>(
      null,
      null,
    ),
);

/**
 * Selects the payment methods resource state (data, selected, isLoading, error).
 */
export const selectPaymentMethods = createSelector(
  selectRampsControllerState,
  (
    rampsControllerState,
  ): ResourceState<PaymentMethod[], PaymentMethod | null> =>
    (rampsControllerState?.paymentMethods as unknown as ResourceState<
      PaymentMethod[],
      PaymentMethod | null
    >) ??
    createDefaultResourceState<PaymentMethod[], PaymentMethod | null>([], null),
);

/**
 * Selects the quotes resource state (data, isLoading, error).
 */
export const selectQuotes = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<QuotesResponse | null> =>
    (rampsControllerState?.quotes as unknown as ResourceState<QuotesResponse | null>) ??
    createDefaultResourceState<QuotesResponse | null>(null),
);

/**
 * Selects the user's selected token from state.
 */
export const selectSelectedToken = createSelector(
  selectRampsControllerState,
  (rampsControllerState) =>
    (rampsControllerState as Record<string, unknown>)?.selectedToken ?? null,
);

/**
 * Selects the user's selected payment method from state.
 */
export const selectSelectedPaymentMethod = createSelector(
  selectRampsControllerState,
  (rampsControllerState) =>
    (rampsControllerState as Record<string, unknown>)?.selectedPaymentMethod ??
    null,
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
