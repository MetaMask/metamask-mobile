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
  (rampsControllerState): TransakState =>
    rampsControllerState?.nativeProviders?.transak ?? {
      isAuthenticated: false,
      userDetails: createDefaultResourceState(null),
      buyQuote: createDefaultResourceState(null),
      kycRequirement: createDefaultResourceState(null),
    },
);
