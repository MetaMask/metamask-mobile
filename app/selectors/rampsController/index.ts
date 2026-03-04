import { createSelector } from 'reselect';
import {
  type UserRegion,
  type Provider,
  type Country,
  type PaymentMethod,
  type RampsToken,
  type TokensResponse,
  type ResourceState,
  type TransakState,
  type RampsOrder,
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
 * Includes status defaulting to 'idle' for tolerance with migrated state.
 */
const createDefaultResourceState = <TData, TSelected = null>(
  data: TData,
  selected: TSelected = null as TSelected,
): ResourceState<TData, TSelected> => ({
  data,
  selected,
  isLoading: false,
  error: null,
  status: 'idle',
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
 * Selects the countries resource state (data, isLoading, error, status).
 */
export const selectCountries = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<Country[]> => {
    const countries = rampsControllerState?.countries;
    if (!countries) {
      return createDefaultResourceState<Country[]>([]);
    }
    // Tolerate missing status from pre-migration state
    return { ...countries, status: countries.status ?? 'idle' };
  },
);

/**
 * Selects the providers resource state (data, selected, isLoading, error, status).
 */
export const selectProviders = createSelector(
  selectRampsControllerState,
  (rampsControllerState): ResourceState<Provider[], Provider | null> => {
    const providers = rampsControllerState?.providers;
    if (!providers) {
      return createDefaultResourceState<Provider[], Provider | null>([], null);
    }
    // Tolerate missing status from pre-migration state
    return { ...providers, status: providers.status ?? 'idle' };
  },
);

/**
 * Selects the tokens resource state (data, selected, isLoading, error, status).
 */
export const selectTokens = createSelector(
  selectRampsControllerState,
  (
    rampsControllerState,
  ): ResourceState<TokensResponse | null, RampsToken | null> => {
    const tokens = rampsControllerState?.tokens;
    if (!tokens) {
      return createDefaultResourceState<
        TokensResponse | null,
        RampsToken | null
      >(null, null);
    }
    // Tolerate missing status from pre-migration state
    return { ...tokens, status: tokens.status ?? 'idle' };
  },
);

/**
 * Selects the payment methods resource state (data, selected, isLoading, error, status).
 */
export const selectPaymentMethods = createSelector(
  selectRampsControllerState,
  (
    rampsControllerState,
  ): ResourceState<PaymentMethod[], PaymentMethod | null> => {
    const paymentMethods = rampsControllerState?.paymentMethods;
    if (!paymentMethods) {
      return createDefaultResourceState<PaymentMethod[], PaymentMethod | null>(
        [],
        null,
      );
    }
    // Tolerate missing status from pre-migration state
    return { ...paymentMethods, status: paymentMethods.status ?? 'idle' };
  },
);

/**
 * Selects V2 orders from RampsController state.
 */
export const selectRampsOrders = createSelector(
  selectRampsControllerState,
  (rampsControllerState): RampsOrder[] => rampsControllerState?.orders ?? [],
);

/**
 * Selects the transak native provider state (isAuthenticated, userDetails, buyQuote, kycRequirement).
 */
export const selectTransak = createSelector(
  selectRampsControllerState,
  (rampsControllerState): TransakState => {
    const transak = rampsControllerState?.nativeProviders?.transak;
    if (!transak) {
      return {
        isAuthenticated: false,
        userDetails: createDefaultResourceState(null),
        buyQuote: createDefaultResourceState(null),
        kycRequirement: createDefaultResourceState(null),
      };
    }
    // Tolerate missing status from pre-migration state on sub-states
    return {
      ...transak,
      userDetails: {
        ...transak.userDetails,
        status: transak.userDetails.status ?? 'idle',
      },
      buyQuote: {
        ...transak.buyQuote,
        status: transak.buyQuote.status ?? 'idle',
      },
      kycRequirement: {
        ...transak.kycRequirement,
        status: transak.kycRequirement.status ?? 'idle',
      },
    };
  },
);
