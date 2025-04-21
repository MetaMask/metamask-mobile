import { useEffect, useMemo } from 'react';
import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';

export default function useFiatCurrencies() {
  const {
    selectedRegion,
    selectedPaymentMethodId,
    selectedFiatCurrencyId,
    setSelectedFiatCurrencyId,
    isBuy,
  } = useRampSDK();

  const [
    {
      data: defaultFiatCurrency,
      error: errorDefaultFiatCurrency,
      isFetching: isFetchingDefaultFiatCurrency,
    },
    queryDefaultFiatCurrency,
  ] = useSDKMethod(
    isBuy ? 'getDefaultFiatCurrency' : 'getDefaultSellFiatCurrency',
    selectedRegion?.id,
    [],
  );

  const [
    {
      data: fiatCurrencies,
      error: errorFiatCurrencies,
      isFetching: isFetchingFiatCurrencies,
    },
    queryGetFiatCurrencies,
  ] = useSDKMethod(
    isBuy ? 'getFiatCurrencies' : 'getSellFiatCurrencies',
    selectedRegion?.id,
    selectedPaymentMethodId ? [selectedPaymentMethodId] : null,
  );

  /**
   * Select the default fiat currency as selected if none is selected.
   */
  useEffect(() => {
    if (
      !isFetchingDefaultFiatCurrency &&
      defaultFiatCurrency &&
      !selectedFiatCurrencyId
    ) {
      setSelectedFiatCurrencyId(defaultFiatCurrency.id);
    }
  }, [
    defaultFiatCurrency,
    isFetchingDefaultFiatCurrency,
    selectedFiatCurrencyId,
    setSelectedFiatCurrencyId,
  ]);

  /**
   * Select the default fiat currency if current selection is not available.
   */
  useEffect(() => {
    if (
      !isFetchingFiatCurrencies &&
      !isFetchingDefaultFiatCurrency &&
      selectedFiatCurrencyId &&
      fiatCurrencies &&
      defaultFiatCurrency &&
      !fiatCurrencies.some((currency) => currency.id === selectedFiatCurrencyId)
    ) {
      setSelectedFiatCurrencyId(defaultFiatCurrency.id);
    }
  }, [
    defaultFiatCurrency,
    fiatCurrencies,
    isFetchingDefaultFiatCurrency,
    isFetchingFiatCurrencies,
    selectedFiatCurrencyId,
    setSelectedFiatCurrencyId,
  ]);

  /**
   * Get the fiat currency object by id
   */
  const currentFiatCurrency = useMemo(
    () =>
      fiatCurrencies?.find?.((curr) => curr.id === selectedFiatCurrencyId) ||
      defaultFiatCurrency,
    [fiatCurrencies, defaultFiatCurrency, selectedFiatCurrencyId],
  );

  return {
    defaultFiatCurrency,
    queryDefaultFiatCurrency,
    fiatCurrencies,
    queryGetFiatCurrencies,
    errorFiatCurrency: errorFiatCurrencies || errorDefaultFiatCurrency,
    isFetchingFiatCurrency:
      isFetchingFiatCurrencies || isFetchingDefaultFiatCurrency,
    currentFiatCurrency,
  };
}
