import { useEffect, useMemo } from 'react';
import { useRampSDK } from '../sdk';
import { Region } from '../types';
import useSDKMethod from './useSDKMethod';
import { Country, State } from '@consensys/on-ramp-sdk';

const isCountry = (region: Country | State | null): region is Country =>
  (region as Country).states !== undefined;

const findDetectedRegion = (regions: Region[]): Region | null => {
  const detectedRegion = regions.find((region) => region.detected);
  if (!detectedRegion) return null;
  if (isCountry(detectedRegion) && detectedRegion.states.length > 0) {
    return findDetectedRegion(detectedRegion.states as Region[]);
  }
  return detectedRegion;
};

export default function useRegions() {
  const { selectedRegion, setSelectedRegion } = useRampSDK();

  const [{ data, isFetching, error }, queryGetCountries] =
    useSDKMethod('getCountries');

  // When region data arrives, we need to match the selected ID in redux with the region in the data
  const updatedRegion = useMemo(() => {
    if (!data) return null;

    // user has no region selected, so we need to find the detected region or the first region in the data
    if (!selectedRegion) {
      const detectedRegion = findDetectedRegion(data);
      if (detectedRegion) {
        return detectedRegion;
      }
      return data[0];
    }

    // user has a region selected, so we need to find the region in the data
    const allRegions: Region[] = data.reduce(
      (acc: Region[], region: Region) => [
        ...acc,
        region,
        ...((region.states as Region[]) || []),
      ],
      [],
    );

    const foundRegion =
      allRegions.find((region) => region.id === selectedRegion.id) ?? null;

    if (foundRegion) {
      return foundRegion;
    }

    // if the region is not found, we need to return the first region in the data
    return data[0];
  }, [data, selectedRegion]);

  useEffect(() => {
    if (!updatedRegion) return;
    setSelectedRegion(updatedRegion);
  }, [updatedRegion, setSelectedRegion, selectedRegion]);

  return {
    data,
    isFetching,
    error,
    query: queryGetCountries,
    selectedRegion,
  };
}
