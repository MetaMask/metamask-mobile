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
import { areAddressesEqual } from '../../util/address';
import { createDeepEqualSelector } from '../util';
import { selectSelectedAccountGroupWithInternalAccountsAddresses } from '../multichainAccounts/accountTreeController';
import { selectPrimaryMoneyAccount } from '../moneyAccountController';
import { toChecksumHexAddress } from '@metamask/controller-utils';

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
 * Selects all V2 orders from RampsController state (unfiltered).
 * For UI scoped to the selected account group, use
 * `selectRampsOrdersForSelectedAccountGroup` instead.
 */
export const selectRampsOrders = createSelector(
  selectRampsControllerState,
  (rampsControllerState): RampsOrder[] => rampsControllerState?.orders ?? [],
);

/**
 * V2 on-ramp orders whose `walletAddress` belongs to the selected account group.
 * Matches legacy `getOrders` scoping for fiat orders.
 */
export const selectRampsOrdersForSelectedAccountGroup = createDeepEqualSelector(
  [selectRampsOrders, selectSelectedAccountGroupWithInternalAccountsAddresses],
  (orders, addresses): RampsOrder[] => {
    if (addresses.length === 0) {
      return [];
    }
    return orders.filter((order) => {
      const walletAddress = order.walletAddress;
      if (!walletAddress) {
        return false;
      }
      return addresses.some(
        (addr) => addr != null && areAddressesEqual(walletAddress, addr),
      );
    });
  },
  {
    devModeChecks: {
      identityFunctionCheck: 'never',
    },
  },
);

/**
 * Selects whether the current provider was auto-selected by the system
 * (soft selection) rather than chosen by the user or derived from order history.
 */
export const selectProviderAutoSelected = createSelector(
  selectRampsControllerState,
  (rampsControllerState): boolean =>
    rampsControllerState?.providerAutoSelected ?? false,
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

/**
 * Primary Money account address, used as `walletAddress` for
 * {@link RampsController.hydrateVbaOnboarding} (selfhosted registration +
 * autoramp create). Must not use the selected account-group EVM address —
 * that registers Account 1 and deposits land outside the Money screen.
 */
export const selectSelectedVbaWalletAddress = createSelector(
  selectPrimaryMoneyAccount,
  (moneyAccount): string | null => {
    const address = moneyAccount?.address;
    if (!address) {
      return null;
    }
    return toChecksumHexAddress(address);
  },
);

/**
 * Autoramp on the Money account address that is not Rejected or Cancelled.
 * A failed account create still counts, but any other usable autoramp wins
 * over it. Reads no feature flag, so an existing account stays reachable when
 * the neobank flags are off.
 *
 * @param autoramps - Autoramps from `RampsController` state.
 * @param walletAddress - Money account address.
 * @returns The usable autoramp, or undefined.
 */
export const findUsableVbaAutoramp = <
  T extends { walletAddress: string; status: string },
>(
  autoramps: readonly T[],
  walletAddress: string | null | undefined,
): T | undefined => {
  const wallet = walletAddress?.trim().toLowerCase();
  if (!wallet) {
    return undefined;
  }
  const usable = autoramps.filter(
    (autoramp) =>
      autoramp.walletAddress?.trim().toLowerCase() === wallet &&
      autoramp.status !== 'Rejected' &&
      autoramp.status !== 'Cancelled',
  );
  return (
    usable.find(
      (autoramp) =>
        autoramp.status !== 'RegistrationFailed' &&
        autoramp.status !== 'AuthorizationFailed',
    ) ?? usable[0]
  );
};

export const selectUsableVbaAutoramp = createSelector(
  selectRampsControllerState,
  selectSelectedVbaWalletAddress,
  (rampsControllerState, walletAddress) =>
    findUsableVbaAutoramp(rampsControllerState?.autoramps ?? [], walletAddress),
);
