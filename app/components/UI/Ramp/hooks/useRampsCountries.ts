import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectCountriesRequest } from '../../../../selectors/rampsController';
import {
  ExecuteRequestOptions,
  RequestSelectorResult,
  type Country,
} from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsCountries hook.
 */
export interface UseRampsCountriesResult {
  /**
   * Whether the countries request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
  /**
   * The cached countries data if available, or null.
   */
  countries: Country[] | null;
  /**
   * Fetch countries for a given action.
   */
  fetchCountries: (
    action?: 'buy' | 'sell',
    options?: ExecuteRequestOptions,
  ) => Promise<Country[]>;
}

/**
 * Hook to get countries request state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @param action - Optional action type ('buy' or 'sell'). Defaults to 'buy'.
 * @returns Countries request state and fetch function.
 */
export function useRampsCountries(
  action: 'buy' | 'sell' = 'buy',
): UseRampsCountriesResult {
  const requestSelector = useMemo(
    () => selectCountriesRequest(action),
    [action],
  );

  const { isFetching, error, data } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<Country[]>;

  const fetchCountries = useCallback(
    async (
      fetchAction: 'buy' | 'sell' = 'buy',
      options?: ExecuteRequestOptions,
    ) => {
      return await Engine.context.RampsController.getCountries(
        fetchAction,
        options,
      );
    },
    [],
  );

  return {
    countries: data ?? null,
    isLoading: isFetching,
    error,
    fetchCountries,
  };
}

export default useRampsCountries;
