import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';
import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { isCaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import { parseCAIP19AssetId } from '../utils/parseCaip19AssetId';
import type { RampIntent } from '../../types';

export default function useCryptoCurrencies() {
  const {
    selectedRegion,
    selectedFiatCurrencyId,
    selectedAsset,
    setSelectedAsset,
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
      if (intent?.assetId) {
        const intentParsedCaip19 = parseCAIP19AssetId(intent.assetId);
        if (intentParsedCaip19) {
          const intentAsset = cryptoCurrencies.find((token) => {
            if (!token.assetId) {
              // Legacy token with EVM chainId and address only

              // We try to match the token initally by chainId
              if (token.network?.chainId !== intentParsedCaip19.chainId) {
                return false;
              }

              // If the token address is the native address, we match it to slip44 namespace
              if (
                token.address === NATIVE_ADDRESS &&
                intentParsedCaip19.assetNamespace === 'slip44'
              ) {
                return true;
              }

              // Finally we match by address
              if (
                token.address?.toLowerCase() ===
                intentParsedCaip19.assetReference.toLowerCase()
              ) {
                return true;
              }

              // The current token does not match the intent
              return false;
            }

            // New token with assetId defined
            if (
              // From the Ramps API we combine chainId and assetId with a slash
              // to form a CAIP19 assetId
              `${token.network.chainId}/${token.assetId}` === intent.assetId
            ) {
              return true;
            }

            return false;
          });

          setIntent((prevIntent: RampIntent | undefined) => ({
            ...prevIntent,
            assetId: undefined,
          }));

          if (intentAsset) {
            setSelectedAsset(intentAsset);
            return;
          }
        }
        setIntent((prevIntent: RampIntent | undefined) => ({
          ...prevIntent,
          assetId: undefined,
        }));
      }

      if (
        !selectedAsset ||
        !cryptoCurrencies.find(
          (token) =>
            token.address === selectedAsset.address &&
            token.network?.chainId === selectedAsset.network?.chainId,
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
    intent?.assetId,
    selectedAsset,
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
