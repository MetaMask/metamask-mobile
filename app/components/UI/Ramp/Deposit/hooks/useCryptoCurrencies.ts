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
        const intentCrypto = cryptoCurrencies.find(
          (token) => token.assetId === intent.assetId,
        );

        setIntent((prevIntent) =>
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
          cryptoCurrencies.find(
            (crypto) => crypto.assetId === selectedCryptoCurrency.assetId,
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
