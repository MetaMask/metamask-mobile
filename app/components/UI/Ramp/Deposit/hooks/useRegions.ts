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

  useEffect(() => {
    if (regions && !selectedRegion) {
      setSelectedRegion(regions[0]);
    }
  }, [regions, selectedRegion, setSelectedRegion]);

  return {
    regions,
    isFetching,
    error,
  };
}
