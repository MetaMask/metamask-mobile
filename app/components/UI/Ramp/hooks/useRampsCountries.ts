import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCountries,
  selectCountriesRequest,
} from '../../../../selectors/rampsController';
import {
  type Country,
  RequestSelectorResult,
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
   * The countries data from state.
   */
  countries: Country[];
}

/**
 * Hook to get countries state from RampsController.
 * This hook assumes Engine is already initialized.
 * Countries are hydrated on init, so there's no need to fetch them manually.
 *
 * @param action - Optional action type ('buy' or 'sell'). Defaults to 'buy'.
 * @returns Countries state.
 */
export function useRampsCountries(
  action: 'buy' | 'sell' = 'buy',
): UseRampsCountriesResult {
  const countries = useSelector(selectCountries);

  const requestSelector = useMemo(
    () => selectCountriesRequest(action),
    [action],
  );

  const { isFetching, error } = useSelector(
    requestSelector,
  ) as RequestSelectorResult<Country[]>;

  return {
    countries,
    isLoading: isFetching,
    error,
  };
}

export default useRampsCountries;
