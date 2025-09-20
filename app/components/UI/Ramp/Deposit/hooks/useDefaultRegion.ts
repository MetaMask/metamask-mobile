import { useCallback, useEffect, useState } from 'react';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';
import { DepositSDKNoAuth } from '../sdk';
import { DepositRegion } from '../constants';
import Logger from '../../../../../util/Logger';

export interface UseDefaultRegionResult {
  defaultRegion: DepositRegion | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to determine the default region based on user's geolocation and available SDK regions.
 *
 * This version is provider-safe and can be used within DepositSDKProvider without circular dependencies.
 * It fetches regions directly using the no-auth SDK instance.
 *
 * @param sdk - Optional SDK instance. If not provided, will use DepositSDKNoAuth
 * @returns Object containing default region, loading state, and error
 */
export function useDefaultRegion(sdk?: NativeRampsSdk): UseDefaultRegionResult {
  const [regions, setRegions] = useState<DepositRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [geoLocation, setGeoLocation] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRegions() {
      try {
        setRegionsLoading(true);
        setRegionsError(null);

        const sdkInstance = sdk || DepositSDKNoAuth;
        const sdkRegions = await sdkInstance.getCountries();

        if (sdkRegions && Array.isArray(sdkRegions)) {
          setRegions(sdkRegions);
        } else {
          setRegions([]);
        }
      } catch (error) {
        Logger.error(error as Error, 'Error fetching regions:');
        setRegionsError((error as Error).message);
        setRegions([]);
      } finally {
        setRegionsLoading(false);
      }
    }

    fetchRegions();
  }, [sdk]);

  useEffect(() => {
    async function fetchGeolocation() {
      try {
        setGeoLoading(true);
        const geo = await DepositSDKNoAuth.getGeolocation();
        setGeoLocation(geo?.ipCountryCode || null);
        setGeoError(null);
      } catch (error) {
        Logger.error(error as Error, 'Error fetching geolocation:');
        setGeoError((error as Error).message);
      } finally {
        setGeoLoading(false);
      }
    }

    fetchGeolocation();
  }, []);

  const getDefaultRegion = useCallback((): DepositRegion | null => {
    if (regions.length === 0) {
      return null;
    }

    if (geoLocation) {
      const matchedRegion = regions.find(
        (region) => region.isoCode === geoLocation && region.supported,
      );
      if (matchedRegion) {
        return matchedRegion;
      }
    }

    // Fallback 1: Find US region if available
    const usRegion = regions.find(
      (region) => region.isoCode === 'US' && region.supported,
    );
    if (usRegion) {
      return usRegion;
    }

    // Fallback 2: Return first supported region
    const firstSupportedRegion = regions.find((region) => region.supported);
    return firstSupportedRegion || null;
  }, [regions, geoLocation]);

  const defaultRegion = getDefaultRegion();
  const isLoading = regionsLoading || geoLoading;
  const error = regionsError || geoError;

  return {
    defaultRegion,
    isLoading,
    error,
  };
}
