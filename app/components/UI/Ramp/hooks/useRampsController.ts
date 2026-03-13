import {
  useRampsUserRegion,
  type UseRampsUserRegionResult,
} from './useRampsUserRegion';
import {
  useRampsProviders,
  type UseRampsProvidersResult,
} from './useRampsProviders';
import { useRampsTokens, type UseRampsTokensResult } from './useRampsTokens';
import {
  useRampsCountries,
  type UseRampsCountriesResult,
} from './useRampsCountries';
import {
  useRampsPaymentMethods,
  type UseRampsPaymentMethodsResult,
} from './useRampsPaymentMethods';
import { useRampsQuotes, type UseRampsQuotesResult } from './useRampsQuotes';
import { useRampsOrders, type UseRampsOrdersResult } from './useRampsOrders';

/**
 * Result returned by the useRampsController hook.
 * This combines all ramps controller functionality into a single interface.
 */
export interface UseRampsControllerResult {
  // User region
  userRegion: UseRampsUserRegionResult['userRegion'];
  setUserRegion: UseRampsUserRegionResult['setUserRegion'];

  // Selected provider
  selectedProvider: UseRampsProvidersResult['selectedProvider'];
  setSelectedProvider: UseRampsProvidersResult['setSelectedProvider'];

  // Providers
  providers: UseRampsProvidersResult['providers'];
  providersLoading: UseRampsProvidersResult['isLoading'];
  providersError: UseRampsProvidersResult['error'];

  // Tokens
  tokens: UseRampsTokensResult['tokens'];
  selectedToken: UseRampsTokensResult['selectedToken'];
  setSelectedToken: UseRampsTokensResult['setSelectedToken'];
  tokensLoading: UseRampsTokensResult['isLoading'];
  tokensError: UseRampsTokensResult['error'];

  // Countries
  countries: UseRampsCountriesResult['countries'];
  countriesLoading: UseRampsCountriesResult['isLoading'];
  countriesError: UseRampsCountriesResult['error'];

  // Payment methods
  paymentMethods: UseRampsPaymentMethodsResult['paymentMethods'];
  selectedPaymentMethod: UseRampsPaymentMethodsResult['selectedPaymentMethod'];
  setSelectedPaymentMethod: UseRampsPaymentMethodsResult['setSelectedPaymentMethod'];
  paymentMethodsLoading: UseRampsPaymentMethodsResult['isLoading'];
  paymentMethodsStatus: UseRampsPaymentMethodsResult['status'];
  paymentMethodsError: UseRampsPaymentMethodsResult['error'];

  // Quotes
  getQuotes: UseRampsQuotesResult['getQuotes'];
  getWidgetUrl: UseRampsQuotesResult['getWidgetUrl'];

  // Orders
  orders: UseRampsOrdersResult['orders'];
  getOrderById: UseRampsOrdersResult['getOrderById'];
  addOrder: UseRampsOrdersResult['addOrder'];
  removeOrder: UseRampsOrdersResult['removeOrder'];
  refreshOrder: UseRampsOrdersResult['refreshOrder'];
  getOrderFromCallback: UseRampsOrdersResult['getOrderFromCallback'];
}

/**
 * Composition hook that provides access to all RampsController functionality.
 * This hook combines all ramps-related hooks into a single entry point.
 *
 * @returns Combined result from all ramps controller hooks.
 *
 * @example
 * ```tsx
 * const {
 *   // User region
 *   userRegion,
 *   setUserRegion,
 *
 *   // Providers
 *   selectedProvider,
 *   setSelectedProvider,
 *   providers,
 *   providersLoading,
 *   providersError,
 *
 *   // Tokens
 *   tokens,
 *   selectedToken,
 *   setSelectedToken,
 *   tokensLoading,
 *   tokensError,
 *
 *   // Countries
 *   countries,
 *   countriesLoading,
 *   countriesError,
 *
 *   // Payment methods
 *   paymentMethods,
 *   selectedPaymentMethod,
 *   setSelectedPaymentMethod,
 *   paymentMethodsLoading,
 *   paymentMethodsError,
 *
 *   // Quotes
 *   getQuotes,
 *   getWidgetUrl,
 *
 * } = useRampsController();
 * ```
 */
export function useRampsController(): UseRampsControllerResult {
  const { userRegion, setUserRegion } = useRampsUserRegion();

  const {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading: providersLoading,
    error: providersError,
  } = useRampsProviders();

  const {
    tokens,
    selectedToken,
    setSelectedToken,
    isLoading: tokensLoading,
    error: tokensError,
  } = useRampsTokens();

  const {
    countries,
    isLoading: countriesLoading,
    error: countriesError,
  } = useRampsCountries();

  const {
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isLoading: paymentMethodsLoading,
    status: paymentMethodsStatus,
    error: paymentMethodsError,
  } = useRampsPaymentMethods();

  const { getQuotes, getWidgetUrl } = useRampsQuotes();

  const {
    orders,
    getOrderById,
    addOrder,
    removeOrder,
    refreshOrder,
    getOrderFromCallback,
  } = useRampsOrders();

  return {
    userRegion,
    setUserRegion,

    selectedProvider,
    setSelectedProvider,

    providers,
    providersLoading,
    providersError,

    tokens,
    selectedToken,
    setSelectedToken,
    tokensLoading,
    tokensError,

    countries,
    countriesLoading,
    countriesError,

    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paymentMethodsLoading,
    paymentMethodsStatus,
    paymentMethodsError,

    getQuotes,
    getWidgetUrl,

    orders,
    getOrderById,
    addOrder,
    removeOrder,
    refreshOrder,
    getOrderFromCallback,
  };
}

export default useRampsController;
