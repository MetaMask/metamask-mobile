import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { selectMusdConversionBlockedCountries } from '../selectors/featureFlags';

/**
 * Hook to determine if the user is eligible for mUSD conversion based on their geolocation.
 *
 * Uses the Ramps geolocation API (via RampsController) to get the user's country code
 * and compares it against a list of blocked countries from LaunchDarkly.
 *
 * IMPORTANT: Defaults to BLOCKING when geolocation is unknown (null) to ensure
 * regulatory compliance. Users in blocked regions cannot bypass restrictions
 * by having geolocation fail to load.
 *
 * @returns Object containing:
 * - isEligible: true only if geolocation is known AND user is not in a blocked country
 * - isLoading: true if geolocation is still pending (null)
 * - geolocation: the user's country/region code (e.g., "GB", "US-CA") or null
 * - blockedCountries: array of blocked country codes from LaunchDarkly
 */
export const useMusdConversionEligibility = () => {
  const geolocation = useSelector(getDetectedGeolocation);
  const blockedCountries = useSelector(selectMusdConversionBlockedCountries);
  const isLoading = geolocation === null;

  const userCountry = useMemo(() => {
    if (geolocation) return geolocation?.toUpperCase().split('-')[0];
    return null;
  }, [geolocation]);

  const isEligible = useMemo(() => {
    // Block by default when geolocation is unknown for regulatory compliance
    if (!userCountry) {
      return false;
    }

    // If no blocked countries configured, allow access
    if (blockedCountries.length === 0) {
      return true;
    }

    // Check if user's country starts with any blocked country code
    // Uses startsWith to handle both "GB" and "GB-ENG" formats

    return blockedCountries.every(
      (blockedCountry) => !userCountry.startsWith(blockedCountry.toUpperCase()),
    );
  }, [userCountry, blockedCountries]);

  return {
    isEligible,
    isLoading,
    geolocation: userCountry,
    blockedCountries,
  };
};
