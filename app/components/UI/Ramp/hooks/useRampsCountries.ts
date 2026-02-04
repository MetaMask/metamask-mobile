import { useSelector } from 'react-redux';
import {
  selectCountries,
  selectCountriesRequest,
} from '../../../../selectors/rampsController';
import {
  RequestSelectorResult,
  type Country,
} from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsCountries hook.
 */
export interface UseRampsCountriesResult {
  /**
   * The list of countries available for ramp actions.
   */
  countries: Country[];
  /**
   * Whether the countries request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
}

/**
 * Hook to get countries state from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @returns Countries state.
 */
export function useRampsCountries(): UseRampsCountriesResult {
  const countries = useSelector(selectCountries);

  const { isFetching, error } = useSelector(
    selectCountriesRequest,
  ) as RequestSelectorResult<Country[]>;

  return {
    countries,
    isLoading: isFetching,
    error,
  };
}

export default useRampsCountries;
