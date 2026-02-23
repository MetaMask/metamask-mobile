import { useSelector } from 'react-redux';
import { selectCountries } from '../../../../selectors/rampsController';
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
  const { data: countries, isLoading, error } = useSelector(selectCountries);

  return {
    countries,
    isLoading,
    error,
  };
}

export default useRampsCountries;
