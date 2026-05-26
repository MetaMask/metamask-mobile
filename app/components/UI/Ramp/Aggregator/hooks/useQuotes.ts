import { useCallback, useMemo } from 'react';
import { useRampSDK } from '../sdk';
import { getMockAggregatorQuotesResponse } from '../utils/getMockAggregatorQuotesResponse';

function useQuotes(amount: number | string) {
  const {
    selectedPaymentMethodId,
    selectedAsset,
    selectedAddress,
    selectedFiatCurrencyId,
    isBuy,
  } = useRampSDK();

  const mockResponse = useMemo(
    () =>
      getMockAggregatorQuotesResponse({
        amount,
        isBuy,
        selectedAsset,
        selectedFiatCurrencyId,
        selectedAddress,
        selectedPaymentMethodId,
      }),
    [
      amount,
      isBuy,
      selectedAsset,
      selectedFiatCurrencyId,
      selectedAddress,
      selectedPaymentMethodId,
    ],
  );

  const query = useCallback(
    () => Promise.resolve(mockResponse),
    [mockResponse],
  );

  return {
    quotes: mockResponse.quotes,
    customActions: mockResponse.customActions,
    sorted: mockResponse.sorted,
    isFetching: false,
    error: null,
    query,
  };
}

export default useQuotes;
