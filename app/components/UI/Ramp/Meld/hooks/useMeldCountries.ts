/**
 * Hook to fetch and manage Meld-supported countries.
 *
 * Replaces: useRegions from the aggregator pattern.
 * Maps to: GET /service-providers/properties/countries
 */

import { useCallback, useEffect } from 'react';
import meldApi from '../api';
import { useMeldContext } from '../MeldProvider';
import useMeldApi from './useMeldApi';
import { MeldCountry } from '../types';

export default function useMeldCountries() {
  const { selectedCountry, setSelectedCountry } = useMeldContext();

  const fetchCountries = useCallback(() => meldApi.getCountries(), []);

  const [{ data: countries, isFetching, error }, refetch] =
    useMeldApi<MeldCountry[]>(fetchCountries);

  // Auto-select first country if none selected
  useEffect(() => {
    if (countries && countries.length > 0 && !selectedCountry) {
      // Try to find US as default, otherwise use first
      const us = countries.find((c) => c.countryCode === 'US');
      setSelectedCountry(us ?? countries[0]);
    }
  }, [countries, selectedCountry, setSelectedCountry]);

  return {
    countries,
    isFetching,
    error,
    refetch,
    selectedCountry,
    setSelectedCountry,
  };
}
