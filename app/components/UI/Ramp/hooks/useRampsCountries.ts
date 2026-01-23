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
   * Fetch countries.
   */
  fetchCountries: (options?: ExecuteRequestOptions) => Promise<Country[]>;
}

/**
 * Hook to get countries request state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * Countries now include a `supported` object with `buy` and `sell` properties
 * indicating whether each action is supported for that country.
 *
 * @returns Countries request state and fetch function.
 */
export function useRampsCountries(): UseRampsCountriesResult {
  const requestSelector = useMemo(() => selectCountriesRequest(), []);

  const { isFetching, error, data } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<Country[]>;

  const fetchCountries = useCallback(
    async (options?: ExecuteRequestOptions) =>
      await Engine.context.RampsController.getCountries(undefined, options),
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
