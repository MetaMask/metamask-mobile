import { useDepositSdkMethod } from './useDepositSdkMethod';
import { useEffect } from 'react';
import { useDepositSDK } from '../sdk';
import { DepositRegion } from '@consensys/native-ramps-sdk/dist/Deposit';

export interface UseRegionsResult {
  regions: DepositRegion[] | null;
  isFetching: boolean;
  error: string | null;
}

export function useRegions(): UseRegionsResult {
  const { selectedRegion, setSelectedRegion } = useDepositSDK();

  const [{ data: regions, error, isFetching }] = 
    useDepositSdkMethod('getCountries');

  console.log('regions', regions);

  useEffect(() => {
    if (regions && !selectedRegion) {
      console.log(
        'SETTING REGION',
        regions.find((region) => region.geolocated)?.isoCode,
      );
      setSelectedRegion(
        regions.find((region) => region.geolocated) || regions[0],
      );
    }
  }, [regions, selectedRegion, setSelectedRegion]);

  return {
    regions,
    isFetching,
    error,
  };
}
