/**
 * Hook to fetch Meld fiat currencies for the selected country.
 *
 * Replaces useFiatCurrencies from the aggregator pattern.
 * Maps to GET /service-providers/properties/fiat-currencies
 * and GET /service-providers/properties/defaults/by-country
 */

import { useCallback, useEffect } from 'react';
import meldApi from '../api';
import { useMeldContext } from '../MeldProvider';
import useMeldApi from './useMeldApi';
import { MeldCountryDefaults, MeldFiatCurrency } from '../types';

export default function useMeldFiatCurrencies() {
  const {
    selectedCountry,
    selectedFiatCurrency,
    setSelectedFiatCurrency,
    setSelectedPaymentMethod,
  } = useMeldContext();

  const countryCode = selectedCountry?.countryCode ?? null;

  // Fetch fiat currencies for the selected country
  const fetchFiatCurrencies = useCallback(
    () =>
      countryCode
        ? meldApi.getFiatCurrencies(countryCode)
        : Promise.resolve([]),
    [countryCode],
  );

  const [{ data: fiatCurrencies, isFetching, error }, refetch] = useMeldApi<
    MeldFiatCurrency[]
  >(countryCode ? fetchFiatCurrencies : null, [countryCode]);

  // Fetch country defaults to auto-select the default currency & payment method
  const fetchDefaults = useCallback(
    () =>
      countryCode
        ? meldApi.getCountryDefaults(countryCode)
        : Promise.resolve([]),
    [countryCode],
  );

  const [{ data: defaults }] = useMeldApi<MeldCountryDefaults[]>(
    countryCode ? fetchDefaults : null,
    [countryCode],
  );

  // Auto-select default fiat currency when country changes
  useEffect(() => {
    if (defaults && defaults.length > 0 && fiatCurrencies) {
      const defaultCode = defaults[0].defaultCurrencyCode;
      const defaultFiat = fiatCurrencies.find(
        (f) => f.currencyCode === defaultCode,
      );
      if (defaultFiat) {
        setSelectedFiatCurrency(defaultFiat);
      } else if (fiatCurrencies.length > 0) {
        setSelectedFiatCurrency(fiatCurrencies[0]);
      }

      // Also set default payment method
      const defaultPayments = defaults[0].defaultPaymentMethods;
      if (defaultPayments?.length > 0) {
        setSelectedPaymentMethod(defaultPayments[0]);
      }
    }
  }, [
    defaults,
    fiatCurrencies,
    setSelectedFiatCurrency,
    setSelectedPaymentMethod,
  ]);

  return {
    fiatCurrencies,
    isFetching,
    error,
    refetch,
    selectedFiatCurrency,
    setSelectedFiatCurrency,
    defaults: defaults?.[0] ?? null,
  };
}
