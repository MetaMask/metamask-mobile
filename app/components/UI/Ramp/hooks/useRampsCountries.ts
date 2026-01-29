import { useSelector } from 'react-redux';
import {
  selectCountries,
  selectCountriesLoading,
  selectCountriesError,
} from '../../../../selectors/rampsController';
import { type Country } from '@metamask/ramps-controller';

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
  const isLoading = useSelector(selectCountriesLoading);
  const error = useSelector(selectCountriesError);

  return {
    countries,
    isLoading,
    error,
  };
}

export default useRampsCountries;
