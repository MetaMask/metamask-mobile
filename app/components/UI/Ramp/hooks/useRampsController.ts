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

/**
 * Options for the useRampsController hook.
 */
export interface UseRampsControllerOptions {
  /**
   * Optional region code to use for providers and tokens requests.
   * If not provided, uses userRegion from state.
   */
  region?: string;
  /**
   * Optional action type ('buy' or 'sell') for tokens requests.
   * Defaults to 'buy'.
   */
  action?: 'buy' | 'sell';
  /**
   * Optional filter options for providers requests.
   */
  providerFilters?: {
    provider?: string | string[];
    crypto?: string | string[];
    fiat?: string | string[];
    payments?: string | string[];
  };
}

/**
 * Result returned by the useRampsController hook.
 * This combines all ramps controller functionality into a single interface.
 */
export interface UseRampsControllerResult {
  userRegion: UseRampsUserRegionResult['userRegion'];
  userRegionLoading: UseRampsUserRegionResult['isLoading'];
  userRegionError: UseRampsUserRegionResult['error'];
  fetchUserRegion: UseRampsUserRegionResult['fetchUserRegion'];
  setUserRegion: UseRampsUserRegionResult['setUserRegion'];

  selectedProvider: UseRampsProvidersResult['selectedProvider'];
  setSelectedProvider: UseRampsProvidersResult['setSelectedProvider'];

  providers: UseRampsProvidersResult['providers'];
  providersLoading: UseRampsProvidersResult['isLoading'];
  providersError: UseRampsProvidersResult['error'];

  tokens: UseRampsTokensResult['tokens'];
  selectedToken: UseRampsTokensResult['selectedToken'];
  setSelectedToken: UseRampsTokensResult['setSelectedToken'];
  tokensLoading: UseRampsTokensResult['isLoading'];
  tokensError: UseRampsTokensResult['error'];

  countries: UseRampsCountriesResult['countries'];
  countriesLoading: UseRampsCountriesResult['isLoading'];
  countriesError: UseRampsCountriesResult['error'];

  paymentMethods: UseRampsPaymentMethodsResult['paymentMethods'];
  selectedPaymentMethod: UseRampsPaymentMethodsResult['selectedPaymentMethod'];
  setSelectedPaymentMethod: UseRampsPaymentMethodsResult['setSelectedPaymentMethod'];
  paymentMethodsLoading: UseRampsPaymentMethodsResult['isLoading'];
  paymentMethodsError: UseRampsPaymentMethodsResult['error'];
}

/**
 * Composition hook that provides access to all RampsController functionality.
 * This hook combines all ramps-related hooks into a single entry point.
 *
 * @param options - Optional configuration for the hook.
 * @returns Combined result from all ramps controller hooks.
 *
 * @example
 * ```tsx
 * const {
 *   userRegion,
 *   userRegionLoading,
 *   userRegionError,
 *   fetchUserRegion,
 *   setUserRegion,
 *
 *   selectedProvider,
 *   setSelectedProvider,
 *   providers,
 *   providersLoading,
 *   providersError,
 *
 *   tokens,
 *   selectedToken,
 *   setSelectedToken,
 *   tokensLoading,
 *   tokensError,
 *
 *   countries,
 *   countriesLoading,
 *   countriesError,
 *
 *   paymentMethods,
 *   selectedPaymentMethod,
 *   setSelectedPaymentMethod,
 *   paymentMethodsLoading,
 *   paymentMethodsError,
 * } = useRampsController({ action: 'buy' });
 * ```
 */
export function useRampsController(
  options?: UseRampsControllerOptions,
): UseRampsControllerResult {
  const {
    userRegion,
    isLoading: userRegionLoading,
    error: userRegionError,
    fetchUserRegion,
    setUserRegion,
  } = useRampsUserRegion();

  const {
    providers,
    selectedProvider,
    setSelectedProvider,
    isLoading: providersLoading,
    error: providersError,
  } = useRampsProviders(options?.region, options?.providerFilters);

  console.log('[useRampsController] selectedProvider:', selectedProvider);

  const {
    tokens,
    selectedToken,
    setSelectedToken,
    isLoading: tokensLoading,
    error: tokensError,
  } = useRampsTokens(options?.region, options?.action);

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
    error: paymentMethodsError,
  } = useRampsPaymentMethods();

  return {
    userRegion,
    userRegionLoading,
    userRegionError,
    fetchUserRegion,
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
    paymentMethodsError,
  };
}

export default useRampsController;
