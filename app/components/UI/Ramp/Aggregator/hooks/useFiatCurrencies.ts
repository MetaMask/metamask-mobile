import { useEffect, useMemo } from 'react';
import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import usePrevious from '../../../../hooks/usePrevious';

export default function useFiatCurrencies() {
  const {
    selectedRegion,
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

  const previousRegion = usePrevious(selectedRegion);

  /**
   * Update fiat currency when region changes and using default currency.
   */
  useEffect(() => {
    const handleRegionChange = async () => {
      if (selectedRegion && previousRegion?.id !== selectedRegion.id) {
        if (selectedFiatCurrencyId === defaultFiatCurrency?.id) {
          const newRegionCurrency = await queryDefaultFiatCurrency(
            selectedRegion.id,
          );
          if (newRegionCurrency?.id) {
            setSelectedFiatCurrencyId(newRegionCurrency.id);
          }
        }
      }
    };

    handleRegionChange();
  }, [
    selectedRegion,
    previousRegion,
    selectedFiatCurrencyId,
    defaultFiatCurrency?.id,
    queryDefaultFiatCurrency,
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
    isFetchingFiatCurrency: isFetchingDefaultFiatCurrency,
    isFetchingFiatCurrencies,
    currentFiatCurrency,
  };
}
