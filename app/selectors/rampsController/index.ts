import { createSelector } from 'reselect';
import {
  createRequestSelector,
  type UserRegion,
  type Provider,
  type Country,
  type PaymentMethod,
  type PaymentMethodsResponse,
  type RampsToken,
  type TokensResponse,
  type QuotesResponse,
  type ResourceState,
  type Quote,
} from '@metamask/ramps-controller';
import { RootState } from '../../reducers';

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
 * Selects the user region from RampsController state (UserRegion | null).
 */
export const selectUserRegion = createSelector(
  selectRampsControllerState,
  (rampsControllerState): UserRegion | null =>
    rampsControllerState?.userRegion ?? null,
);

/**
 * Selects the countries resource state (data, isLoading, error).
 */
export const selectCountries = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<Country[]> =>
    rampsControllerState?.countries ??
    createDefaultResourceState<Country[]>([]),
);

/**
 * Selects the providers resource state (data, selected, isLoading, error).
 */
export const selectProviders = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<Provider[], Provider | null> =>
    rampsControllerState?.providers ??
    createDefaultResourceState<Provider[], Provider | null>([], null),
);

/**
 * Selects the tokens resource state (data, selected, isLoading, error).
 */
export const selectTokens = createSelector(
  selectRampsControllerState,
  (
    rampsControllerState,
  ): ResourceState<TokensResponse | null, RampsToken | null> =>
    rampsControllerState?.tokens ??
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
    rampsControllerState?.paymentMethods ??
    createDefaultResourceState<PaymentMethod[], PaymentMethod | null>([], null),
);

/**
 * Selects the payment methods request state for a given context.
 * Note: This is kept for backwards compatibility with existing code that uses request-based tracking.
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

/**
 * Selects the quotes ResourceState from state.
 * Returns the full ResourceState with data, selected, isLoading, and error.
 */
export const selectQuotesState = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<QuotesResponse | null, Quote | null> =>
    rampsControllerState?.quotes ??
    createDefaultResourceState<QuotesResponse | null, Quote | null>(null, null),
);

/**
 * Selects the quotes data from state.
 * Returns QuotesResponse | null.
 */
export const selectQuotes = createSelector(
  selectQuotesState,
  (quotesState) => quotesState.data,
);

/**
 * Selects the currently selected quote from state.
 * Auto-selected by the controller when exactly 1 quote is returned.
 */
export const selectSelectedQuote = createSelector(
  selectQuotesState,
  (quotesState) => quotesState.selected,
);

/**
 * Selects the quotes loading state.
 * Returns true when quotes are being fetched.
 */
export const selectQuotesIsLoading = createSelector(
  selectQuotesState,
  (quotesState) => quotesState.isLoading,
);

/**
 * Selects the quotes error state.
 * Returns error message or null.
 */
export const selectQuotesError = createSelector(
  selectQuotesState,
  (quotesState) => quotesState.error,
);
