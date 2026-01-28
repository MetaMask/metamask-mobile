import {
  useDepositSdkMethod,
  DepositSdkMethodQuery,
} from './useDepositSdkMethod';
import { useDepositSDK } from '../sdk';
import { useEffect, useMemo } from 'react';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { isCaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';
import { toLowerCaseEquals } from '../../../../../util/general';
import { parseCAIP19AssetId } from '../../Aggregator/utils/parseCaip19AssetId';
import type { DepositNavigationParams } from '../types';

export interface UseCryptoCurrenciesResult {
  cryptoCurrencies: DepositCryptoCurrency[] | null;
  isFetching: boolean;
  error: string | null;
  retryFetchCryptoCurrencies: DepositSdkMethodQuery<'getCryptoCurrencies'>;
}

export function useCryptoCurrencies(): UseCryptoCurrenciesResult {
  const {
    selectedRegion,
    selectedCryptoCurrency,
    setSelectedCryptoCurrency,
    intent,
    setIntent,
  } = useDepositSDK();

  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const [
    { data: sdkCryptoCurrencies, error, isFetching },
    retryFetchCryptoCurrencies,
  ] = useDepositSdkMethod('getCryptoCurrencies', selectedRegion?.isoCode);

  const cryptoCurrencies = useMemo(() => {
    if (!isFetching && !error && sdkCryptoCurrencies) {
      const filteredTokens = sdkCryptoCurrencies.filter((token) => {
        if (!token.chainId) return false;

        const tokenCaipChainId = isCaipChainId(token.chainId)
          ? token.chainId
          : toEvmCaipChainId(toHex(token.chainId));

        return networksByCaipChainId[tokenCaipChainId] !== undefined;
      });
      return filteredTokens;
    }
    return null;
  }, [error, isFetching, sdkCryptoCurrencies, networksByCaipChainId]);

  useEffect(() => {
    if (cryptoCurrencies && cryptoCurrencies.length > 0) {
      if (intent?.assetId) {
        let intentCrypto = cryptoCurrencies.find((token) =>
          toLowerCaseEquals(token.assetId, intent.assetId),
        );

        // Handle slip44 wildcard matching any native asset
        if (!intentCrypto) {
          const intentParsedCaip19 = parseCAIP19AssetId(intent.assetId);
          if (intentParsedCaip19?.assetNamespace === 'slip44') {
            intentCrypto = cryptoCurrencies.find((token) => {
              const tokenParsed = parseCAIP19AssetId(token.assetId);
              return (
                tokenParsed &&
                tokenParsed.namespace === intentParsedCaip19.namespace &&
                tokenParsed.chainId === intentParsedCaip19.chainId &&
                tokenParsed.assetNamespace === 'slip44'
              );
            });
          }
        }

        setIntent((prevIntent: DepositNavigationParams | undefined) =>
          prevIntent ? { ...prevIntent, assetId: undefined } : undefined,
        );

        if (intentCrypto) {
          setSelectedCryptoCurrency(intentCrypto);
          return;
        }
      }

      let newSelectedCrypto: DepositCryptoCurrency | null = null;

      if (selectedCryptoCurrency) {
        newSelectedCrypto =
          cryptoCurrencies.find((crypto) =>
            toLowerCaseEquals(crypto.assetId, selectedCryptoCurrency.assetId),
          ) || null;
      }

      if (!newSelectedCrypto) {
        newSelectedCrypto = cryptoCurrencies[0];
      }

      if (newSelectedCrypto) {
        setSelectedCryptoCurrency(newSelectedCrypto);
      }
    }
  }, [
    cryptoCurrencies,
    selectedCryptoCurrency,
    setSelectedCryptoCurrency,
    intent,
    setIntent,
  ]);

  return {
    cryptoCurrencies,
    isFetching,
    error,
    retryFetchCryptoCurrencies,
  };
}
