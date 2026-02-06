/**
 * Hook to fetch Meld payment methods for the selected fiat currency.
 *
 * Replaces: usePaymentMethods from the aggregator pattern.
 * Maps to: GET /service-providers/properties/payment-methods
 */

import { useCallback } from 'react';
import meldApi from '../api';
import { useMeldContext } from '../MeldProvider';
import useMeldApi from './useMeldApi';
import { MeldPaymentMethod } from '../types';

export default function useMeldPaymentMethods() {
  const {
    selectedFiatCurrency,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  } = useMeldContext();

  const fiatCode = selectedFiatCurrency?.currencyCode ?? null;

  const fetchPaymentMethods = useCallback(
    () =>
      fiatCode ? meldApi.getPaymentMethods(fiatCode) : Promise.resolve([]),
    [fiatCode],
  );

  const [{ data: paymentMethods, isFetching, error }, refetch] = useMeldApi<
    MeldPaymentMethod[]
  >(fiatCode ? fetchPaymentMethods : null, [fiatCode]);

  return {
    paymentMethods,
    isFetching,
    error,
    refetch,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  };
}
