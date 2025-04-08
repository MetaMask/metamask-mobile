import { useEffect, useMemo } from 'react';
import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';

export default function useCryptoCurrencies() {
  const {
    selectedRegion,
    selectedPaymentMethodId,
    selectedFiatCurrencyId,
    selectedAsset,
    setSelectedAsset,
    selectedChainId,
    isBuy,
    intent,
    setIntent,
  } = useRampSDK();

  const [
    {
      data: sdkCryptoCurrencies,
      error: errorCryptoCurrencies,
      isFetching: isFetchingCryptoCurrencies,
    },
    queryGetCryptoCurrencies,
  ] = useSDKMethod(
    isBuy ? 'getCryptoCurrencies' : 'getSellCryptoCurrencies',
    selectedRegion?.id,
    selectedPaymentMethodId ? [selectedPaymentMethodId] : null,
    selectedFiatCurrencyId,
  );

  const cryptoCurrencies = useMemo(() => {
    if (
      !isFetchingCryptoCurrencies &&
      !errorCryptoCurrencies &&
      sdkCryptoCurrencies
    ) {
      const filteredTokens = sdkCryptoCurrencies.filter(
        (token) => token.network?.chainId === selectedChainId,
      );
      return filteredTokens;
    }
    return null;
  }, [
    errorCryptoCurrencies,
    isFetchingCryptoCurrencies,
    sdkCryptoCurrencies,
    selectedChainId,
  ]);

  /**
   * Select the native crypto currency of first of the list
   * if current selection is not available.
   * This is using the already filtered list of tokens.
   */
  useEffect(() => {
    if (cryptoCurrencies) {
      if (intent?.address) {
        const intentAsset = cryptoCurrencies.find(
          (token) =>
            token.address.toLowerCase() === intent.address?.toLowerCase(),
        );
        if (intentAsset) {
          setSelectedAsset(intentAsset);
          setIntent((prevIntent) => ({ ...prevIntent, address: undefined }));
          return;
        }
      }

      if (
        !selectedAsset ||
        `${selectedAsset.network?.chainId}` !== selectedChainId ||
        !cryptoCurrencies.find(
          (token) => token.address === selectedAsset.address,
        )
      ) {
        const nativeAsset = cryptoCurrencies.find(
          (a) => a.address === NATIVE_ADDRESS,
        );
        setSelectedAsset(nativeAsset || cryptoCurrencies?.[0]);
      }
    }
  }, [
    cryptoCurrencies,
    intent?.address,
    selectedAsset,
    selectedChainId,
    setSelectedAsset,
    setIntent,
  ]);

  return {
    cryptoCurrencies,
    errorCryptoCurrencies,
    isFetchingCryptoCurrencies,
    queryGetCryptoCurrencies,
  };
}
