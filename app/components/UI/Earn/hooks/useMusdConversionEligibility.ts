import { useSelector } from 'react-redux';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { selectMusdConversionBlockedCountries } from '../selectors/featureFlags';
import { useMemo } from 'react';
import { selectIsMusdConversionGeoEligible } from '../selectors/eligibility';

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
 * - isLoading: true if geolocation is still pending (undefined)
 * - geolocation: the user's country code (e.g., "GB", "US") or null
 * - blockedCountries: array of blocked country codes from LaunchDarkly
 */
export const useMusdConversionEligibility = () => {
  const geolocation = useSelector(getDetectedGeolocation);
  const blockedCountries = useSelector(selectMusdConversionBlockedCountries);
  const isEligible = useSelector(selectIsMusdConversionGeoEligible);
  const isLoading = geolocation === undefined;

  const userCountryCode = useMemo(() => {
    if (geolocation) return geolocation?.toUpperCase().split('-')[0];
    return null;
  }, [geolocation]);

  return {
    isEligible,
    isLoading,
    geolocation: userCountryCode,
    blockedCountries,
  };
};
