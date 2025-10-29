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

export function useRegions(screenLocation?: string): UseRegionsResult {
  const { selectedRegion, setSelectedRegion, isAuthenticated } =
    useDepositSDK();
  const [{ data: regions, error, isFetching }, retryFetchRegions] =
    useDepositSdkMethod('getCountries');

  const { userDetails } = useDepositUser(screenLocation);
  const [userRegionLocked, setUserRegionLocked] = useState<boolean>(false);

  useEffect(() => {
    setUserRegionLocked(false);

    if (regions && regions.length > 0) {
      if (isAuthenticated && userDetails?.address?.countryCode) {
        const userRegion = regions.find(
          (region) => region.isoCode === userDetails.address.countryCode,
        );

        if (userRegion) {
          setSelectedRegion(userRegion);
          setUserRegionLocked(true);
          return;
        }
      }

      let newSelectedRegion: DepositRegion | null = null;
      if (selectedRegion) {
        newSelectedRegion =
          regions.find((region) => region.isoCode === selectedRegion.isoCode) ||
          null;
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
