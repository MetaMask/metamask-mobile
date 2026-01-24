import { useSelector } from 'react-redux';
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
  type UseRampsPaymentMethodsResult
} from './useRampsPaymentMethods';
import { selectSelectedToken } from '../../../../selectors/rampsController';
import type { RampsToken } from '@metamask/ramps-controller';

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
  // User region
  userRegion: UseRampsUserRegionResult['userRegion'];
  userRegionLoading: UseRampsUserRegionResult['isLoading'];
  userRegionError: UseRampsUserRegionResult['error'];
  fetchUserRegion: UseRampsUserRegionResult['fetchUserRegion'];
  setUserRegion: UseRampsUserRegionResult['setUserRegion'];

  // Preferred provider (selected provider)
  preferredProvider: UseRampsProvidersResult['preferredProvider'];
  setPreferredProvider: UseRampsProvidersResult['setPreferredProvider'];

  // Providers
  providers: UseRampsProvidersResult['providers'];
  providersLoading: UseRampsProvidersResult['isLoading'];
  providersError: UseRampsProvidersResult['error'];
  fetchProviders: UseRampsProvidersResult['fetchProviders'];

  // Tokens
  tokens: UseRampsTokensResult['tokens'];
  tokensLoading: UseRampsTokensResult['isLoading'];
  tokensError: UseRampsTokensResult['error'];
  fetchTokens: UseRampsTokensResult['fetchTokens'];

  // Countries
  countries: UseRampsCountriesResult['countries'];
  countriesLoading: UseRampsCountriesResult['isLoading'];
  countriesError: UseRampsCountriesResult['error'];
  fetchCountries: UseRampsCountriesResult['fetchCountries'];

  // Payment methods
  paymentMethods: UseRampsPaymentMethodsResult['paymentMethods'];
  paymentMethodsLoading: UseRampsPaymentMethodsResult['isLoading'];
  paymentMethodsError: UseRampsPaymentMethodsResult['error'];
  setSelectedPaymentMethod: UseRampsPaymentMethodsResult['setSelectedPaymentMethod'];
  selectedPaymentMethod: UseRampsPaymentMethodsResult['selectedPaymentMethod'];
  fetchPaymentMethods: UseRampsPaymentMethodsResult['fetchPaymentMethods'];

  // Selected token
  selectedToken: RampsToken | null;
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
 *   // User region
 *   userRegion,
 *   userRegionLoading,
 *   userRegionError,
 *   fetchUserRegion,
 *   setUserRegion,
 *
 *   // Preferred provider
 *   preferredProvider,
 *   setPreferredProvider,
 *
 *   // Providers
 *   providers,
 *   providersLoading,
 *   providersError,
 *   fetchProviders,
 *
 *   // Tokens
 *   tokens,
 *   tokensLoading,
 *   tokensError,
 *   fetchTokens,
 *
 *   // Countries
 *   countries,
 *   countriesLoading,
 *   countriesError,
 *   fetchCountries,
 *
 *   // Payment methods
 *   paymentMethods,
 *   selectedPaymentMethod,
 *   paymentMethodsLoading,
 *   paymentMethodsError,
 *   fetchPaymentMethods,
 *   setSelectedPaymentMethod,
 *
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
    preferredProvider,
    isLoading: providersLoading,
    error: providersError,
    fetchProviders,
    setPreferredProvider,
  } = useRampsProviders(options?.region, options?.providerFilters);

  console.log('[useRampsController] preferredProvider:', preferredProvider);

  const {
    tokens,
    isLoading: tokensLoading,
    error: tokensError,
    fetchTokens,
  } = useRampsTokens(options?.region, options?.action);

  const {
    countries,
    isLoading: countriesLoading,
    error: countriesError,
    fetchCountries,
  } = useRampsCountries();

  const {
    paymentMethods,
    selectedPaymentMethod,
    isLoading: paymentMethodsLoading,
    error: paymentMethodsError,
    fetchPaymentMethods,
    setSelectedPaymentMethod,
  } = useRampsPaymentMethods();

  const selectedToken = useSelector(selectSelectedToken);

  return {
    // User region
    userRegion,
    userRegionLoading,
    userRegionError,
    fetchUserRegion,
    setUserRegion,

    // Preferred provider
    preferredProvider,
    setPreferredProvider,

    // Providers
    providers,
    providersLoading,
    providersError,
    fetchProviders,

    // Tokens
    tokens,
    tokensLoading,
    tokensError,
    fetchTokens,

    // Countries
    countries,
    countriesLoading,
    countriesError,
    fetchCountries,

    // Payment methods
    paymentMethods,
    selectedPaymentMethod,
    paymentMethodsLoading,
    paymentMethodsError,
    fetchPaymentMethods,
    setSelectedPaymentMethod,

    // Selected token
    selectedToken,
  };
}

export default useRampsController;
