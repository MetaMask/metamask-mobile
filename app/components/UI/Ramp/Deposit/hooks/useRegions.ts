import {
  DepositSdkMethodQuery,
  useDepositSdkMethod,
} from './useDepositSdkMethod';
import { useEffect, useState } from 'react';
import { useDepositSDK } from '../sdk';
import { DepositRegion } from '@consensys/native-ramps-sdk';
import { useDepositUser } from './useDepositUser';

export interface UseRegionsResult {
  userRegionLocked: boolean;
  regions: DepositRegion[] | null;
  isFetching: boolean;
  error: string | null;
  retryFetchRegions: DepositSdkMethodQuery<'getCountries'>;
}

export function useRegions(): UseRegionsResult {
  const { selectedRegion, setSelectedRegion, isAuthenticated } =
    useDepositSDK();
  const [{ data: regions, error, isFetching }, retryFetchRegions] =
    useDepositSdkMethod('getCountries');

  const { userDetails } = useDepositUser();
  const [userRegionLocked, setUserRegionLocked] = useState<boolean>(false);

  useEffect(() => {
    const fetchRegionsAndSetDefault = async () => {
      if (regions && regions.length > 0) {
        // Reset lock state first
        setUserRegionLocked(false);

        // Only lock region if user is authenticated AND has user details with a country
        if (isAuthenticated && userDetails?.address?.countryCode) {
          const userRegion =
            regions.find(
              (region) => region.isoCode === userDetails.address.countryCode,
            ) || null;

          if (userRegion) {
            setSelectedRegion(userRegion);
            setUserRegionLocked(true);
            return;
          }
        }

        let newSelectedRegion: DepositRegion | null = null;
        if (selectedRegion) {
          newSelectedRegion =
            regions.find(
              (region) => region.isoCode === selectedRegion.isoCode,
            ) || null;
        }

        if (!newSelectedRegion) {
          newSelectedRegion =
            regions.find((region) => region.geolocated) ||
            regions.find((region) => region.isoCode === 'US') ||
            regions[0];
        }

        if (newSelectedRegion) {
          setSelectedRegion(newSelectedRegion);
        }
      }
    };
    fetchRegionsAndSetDefault();
  }, [
    regions,
    selectedRegion,
    setSelectedRegion,
    isAuthenticated,
    userDetails,
  ]);

  return {
    userRegionLocked,
    regions,
    isFetching,
    error,
    retryFetchRegions,
  };
}
