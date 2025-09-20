import { useMemo } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';
import { DepositRegion } from '../constants';

export interface UseRegionsResult {
  regions: DepositRegion[];
  isLoading: boolean;
  error: string | null;
}

export function useRegions(): UseRegionsResult {
  const [{ data: sdkRegions, error, isFetching }] = useDepositSdkMethod({
    method: 'getCountries',
    onMount: true,
    throws: false,
  });

  const result = useMemo(() => {
    const validRegions =
      sdkRegions && Array.isArray(sdkRegions) ? sdkRegions : [];

    return {
      regions: validRegions,
      isLoading: isFetching,
      error,
    };
  }, [sdkRegions, isFetching, error]);

  return result;
}
