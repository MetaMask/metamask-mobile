import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { isCaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';

export default function useCryptoCurrencies() {
  const {
    selectedRegion,
    selectedFiatCurrencyId,
    selectedAsset,
    setSelectedAsset,
    selectedChainId,
    isBuy,
    intent,
    setIntent,
  } = useRampSDK();

  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

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
    [], // paymentMethodIds is passed as a wildcard to fetch all cryptocurrencies
    selectedFiatCurrencyId,
  );

  const cryptoCurrencies = useMemo(() => {
    if (
      !isFetchingCryptoCurrencies &&
      !errorCryptoCurrencies &&
      sdkCryptoCurrencies
    ) {
      const filteredTokens = sdkCryptoCurrencies.filter((token) => {
        if (!token.network?.chainId) return false;

        const tokenCaipChainId = isCaipChainId(token.network.chainId)
          ? token.network.chainId
          : toEvmCaipChainId(toHex(token.network.chainId));

        return networksByCaipChainId[tokenCaipChainId] !== undefined;
      });
      return filteredTokens;
    }
    return null;
  }, [
    errorCryptoCurrencies,
    isFetchingCryptoCurrencies,
    sdkCryptoCurrencies,
    networksByCaipChainId,
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
        !cryptoCurrencies.find(
          (token) =>
            token.address === selectedAsset.address &&
            token.network?.chainId === selectedAsset.network?.chainId,
        )
      ) {
        const nativeAssetForCurrentChain = cryptoCurrencies.find(
          (a) =>
            a.address === NATIVE_ADDRESS &&
            a.network?.chainId === selectedChainId,
        );
        const fallbackNativeAsset = cryptoCurrencies.find(
          (a) => a.address === NATIVE_ADDRESS,
        );
        setSelectedAsset(
          nativeAssetForCurrentChain ||
            fallbackNativeAsset ||
            cryptoCurrencies?.[0],
        );
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
