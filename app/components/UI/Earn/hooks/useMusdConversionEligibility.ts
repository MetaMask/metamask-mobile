import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectGeolocation } from '../../../../selectors/rampsController';
import { selectMusdConversionBlockedCountries } from '../selectors/featureFlags';

/**
 * Hook to determine if the user is eligible for mUSD conversion based on their geolocation.
 *
 * Uses the Ramps geolocation API (via RampsController) to get the user's country code
 * and compares it against a list of blocked countries from LaunchDarkly.
 *
 * @returns Object containing:
 * - isEligible: true if user is not in a blocked country (or if geolocation/blocked list unavailable)
 * - geolocation: the user's country/region code (e.g., "GB", "US-CA") or null
 * - blockedCountries: array of blocked country codes from LaunchDarkly
 */
export const useMusdConversionEligibility = () => {
  const geolocation = useSelector(selectGeolocation);
  const blockedCountries = useSelector(selectMusdConversionBlockedCountries);

  const isEligible = useMemo(() => {
    // Default to eligible if geolocation is unknown or no blocked countries configured
    if (!geolocation || blockedCountries.length === 0) {
      return true;
    }

    // Check if user's country starts with any blocked country code
    // Uses startsWith to handle both "GB" and "GB-ENG" formats
    const userCountry = geolocation.toUpperCase();
    return blockedCountries.every(
      (blockedCountry) => !userCountry.startsWith(blockedCountry.toUpperCase()),
    );
  }, [geolocation, blockedCountries]);

  return {
    isEligible,
    geolocation,
    blockedCountries,
  };
};
