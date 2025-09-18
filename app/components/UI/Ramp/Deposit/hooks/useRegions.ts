import {
  DepositSdkMethodQuery,
  useDepositSdkMethod,
} from './useDepositSdkMethod';
import { useEffect } from 'react';
import { useDepositSDK } from '../sdk';
import { DepositRegion } from '@consensys/native-ramps-sdk';

export interface UseRegionsResult {
  regions: DepositRegion[] | null;
  isFetching: boolean;
  error: string | null;
  retryFetchRegions: DepositSdkMethodQuery<'getCountries'>;
}

export function useRegions(): UseRegionsResult {
  const { selectedRegion, setSelectedRegion } = useDepositSDK();
  const [{ data: regions, error, isFetching }, retryFetchRegions] =
    useDepositSdkMethod('getCountries');

  useEffect(() => {
    if (regions && regions.length > 0) {
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
  }, [regions, selectedRegion, setSelectedRegion]);

  return {
    regions,
    isFetching,
    error,
    retryFetchRegions,
  };
}
