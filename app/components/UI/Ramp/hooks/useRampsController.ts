import {
  useRampsUserRegion,
  type UseRampsUserRegionResult,
} from './useRampsUserRegion';
import {
  useRampsPreferredProvider,
  type UseRampsPreferredProviderResult,
} from './useRampsPreferredProvider';
import {
  useRampsProviders,
  type UseRampsProvidersResult,
} from './useRampsProviders';
import { useRampsTokens, type UseRampsTokensResult } from './useRampsTokens';
import {
  useRampsCountries,
  type UseRampsCountriesResult,
} from './useRampsCountries';
import { useRampsPreferredProviderAutoSet } from './useRampsPreferredProviderAutoSet';

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
   * Optional action type ('buy' or 'sell') for tokens and countries requests.
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
  setUserRegion: UseRampsUserRegionResult['setUserRegion'];

  // Preferred provider
  preferredProvider: UseRampsPreferredProviderResult['preferredProvider'];
  setPreferredProvider: UseRampsPreferredProviderResult['setPreferredProvider'];

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
    setUserRegion,
  } = useRampsUserRegion();

  const { preferredProvider, setPreferredProvider } =
    useRampsPreferredProvider();

  const {
    providers,
    isLoading: providersLoading,
    error: providersError,
    fetchProviders,
  } = useRampsProviders(options?.region, options?.providerFilters);

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
  } = useRampsCountries(options?.action);

  useRampsPreferredProviderAutoSet();

  return {
    // User region
    userRegion,
    userRegionLoading,
    userRegionError,
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
  };
}

export default useRampsController;
