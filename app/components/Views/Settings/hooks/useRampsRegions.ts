import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectGetCountriesRequest } from '../../../../selectors/rampsController';
import { Country } from '@metamask/ramps-controller';

/**
 * Result returned by the useRampsRegions hook.
 */
export interface UseRampsRegionsResult {
  /**
   * The list of available countries/regions.
   */
  regions: Country[] | null;
  /**
   * Whether the regions request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
  /**
   * Manually fetch the regions.
   */
  fetchRegions: (action?: 'buy' | 'sell') => Promise<Country[]>;
}

/**
 * Hook to get the available regions from RampsController.
 * This hook assumes Engine is already initialized.
 *
 * @returns Regions state and fetch function.
 */
export function useRampsRegions(): UseRampsRegionsResult {
  const {
    data: regions,
    isFetching,
    error,
  } = useSelector(selectGetCountriesRequest);

  const fetchRegions = useCallback(
    (action: 'buy' | 'sell' = 'buy') =>
      Engine.context.RampsController.getCountries(action),
    [],
  );

  useEffect(() => {
    fetchRegions().catch(() => {
      // Error is stored in state
    });
  }, [fetchRegions]);

  return {
    regions: regions ?? null,
    isLoading: isFetching,
    error: error ?? null,
    fetchRegions,
  };
}

export default useRampsRegions;
