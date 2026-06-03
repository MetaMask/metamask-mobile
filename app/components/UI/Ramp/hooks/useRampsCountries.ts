import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectCountries } from '../../../../selectors/rampsController';
import { type Country } from '@metamask/ramps-controller';
import { parseUserFacingError } from '../utils/parseUserFacingError';

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
  const countriesState = useSelector(selectCountries);
  const { data: countries, isLoading, error } = countriesState;

  return {
    countries,
    isLoading,
    error: error
      ? parseUserFacingError(
          countriesState,
          strings('fiat_on_ramp.payment_error'),
        )
      : null,
  };
}

export default useRampsCountries;
