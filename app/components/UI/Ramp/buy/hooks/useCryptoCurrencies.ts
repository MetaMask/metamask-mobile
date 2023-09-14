import { useRampSDK } from '../../common/sdk';
import useSDKMethod from '../../common/hooks/useSDKMethod';
import { useEffect, useMemo } from 'react';
import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';

export default function useCryptoCurrencies() {
  const {
    selectedRegion,
    selectedPaymentMethodId,
    selectedFiatCurrencyId,
    selectedAsset,
    setSelectedAsset,
    selectedChainId,
  } = useRampSDK();

  const [
    {
      data: sdkCryptoCurrencies,
      error: errorCryptoCurrencies,
      isFetching: isFetchingCryptoCurrencies,
    },
    queryGetCryptoCurrencies,
  ] = useSDKMethod(
    'getCryptoCurrencies',
    selectedRegion?.id,
    selectedPaymentMethodId,
    selectedFiatCurrencyId,
  );

  const cryptoCurrencies = useMemo(() => {
    if (
      !isFetchingCryptoCurrencies &&
      !errorCryptoCurrencies &&
      sdkCryptoCurrencies
    ) {
      const filteredTokens = sdkCryptoCurrencies.filter(
        (token) => Number(token.network?.chainId) === Number(selectedChainId),
      );
      return filteredTokens;
    }
    return null;
  }, [errorCryptoCurrencies, isFetchingCryptoCurrencies, sdkCryptoCurrencies]);

  /**
   * Select the native crypto currency of first of the list
   * if current selection is not available.
   * This is using the already filtered list of tokens.
   */
  useEffect(() => {
    if (cryptoCurrencies) {
      if (
        !selectedAsset ||
        !cryptoCurrencies.find(
          (token) => token.address === selectedAsset.address,
        )
      ) {
        setSelectedAsset(
          cryptoCurrencies.find((a) => a.address === NATIVE_ADDRESS) ||
            cryptoCurrencies?.[0],
        );
      }
    }
  }, [cryptoCurrencies, selectedAsset, setSelectedAsset]);

  return {
    cryptoCurrencies,
    errorCryptoCurrencies,
    isFetchingCryptoCurrencies,
    queryGetCryptoCurrencies,
  };
}
