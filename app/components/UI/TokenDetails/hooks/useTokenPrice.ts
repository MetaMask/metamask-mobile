import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import {
  selectNativeCurrencyByChainId,
  selectSelectedNetworkClientId,
} from '../../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import useTokenHistoricalPrices, {
  TimePeriod,
  TokenPrice,
} from '../../../hooks/useTokenHistoricalPrices';
import { RootState } from '../../../../reducers';
import { TokenI } from '../../Tokens/types';
import {
  isAssetFromSearch,
  selectTokenDisplayData,
} from '../../../../selectors/tokenSearchDiscoveryDataController';
import { calculateAssetPrice } from '../../AssetOverview/utils/calculateAssetPrice';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { getTokenExchangeRate } from '../../Bridge/utils/exchange-rates';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { safeToChecksumAddress } from '../../../../util/address';

export interface UseTokenPriceResult {
  currentPrice: number;
  priceDiff: number;
  comparePrice: number;
  prices: TokenPrice[];
  isLoading: boolean;
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
  chartNavigationButtons: TimePeriod[];
  currentCurrency: string;
}

export interface UseTokenPriceParams {
  token: TokenI;
  multichainAssetRates?: {
    rate: number;
    marketData: undefined;
  };
}

/**
 * Hook that handles price fetching and calculations for a token.
 * Manages historical prices, exchange rates, and price comparisons.
 */
export const useTokenPrice = ({
  token,
  multichainAssetRates,
}: UseTokenPriceParams): UseTokenPriceResult => {
  const chainId = token.chainId as Hex;
  const isNonEvmToken = formatChainIdToCaip(chainId) === token.chainId;

  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1d');

  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allTokenMarketData = useSelector(selectTokenMarketData);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );

  const tokenResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, chainId, token.address as Hex),
  );

  const itemAddress = !isNonEvmToken
    ? safeToChecksumAddress(token.address)
    : token.address;

  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    asset: token,
    address: token.address as Hex,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  useEffect(() => {
    const { SwapsController } = Engine.context;
    const fetchTokenWithCache = async () => {
      try {
        await SwapsController.fetchTokenWithCache({
          networkClientId: selectedNetworkClientId,
        });
      } catch (error) {
        Logger.error(
          error as Error,
          'Swaps: error while fetching tokens with cache in useTokenPrice',
        );
      }
    };
    fetchTokenWithCache();
  }, [selectedNetworkClientId]);

  const chartNavigationButtons: TimePeriod[] = useMemo(
    () =>
      !isNonEvmToken
        ? ['1d', '1w', '1m', '3m', '1y', '3y']
        : ['1d', '1w', '1m', '3m', '1y', 'all'],
    [isNonEvmToken],
  );

  const marketDataRate =
    allTokenMarketData?.[chainId]?.[itemAddress as Hex]?.price;

  const [fetchedRate, setFetchedRate] = useState<number | undefined>();

  useEffect(() => {
    if (marketDataRate !== undefined || !itemAddress) {
      return;
    }

    const isNonEvm = isNonEvmChainId(chainId);
    const nativeTokenConversionRate =
      nativeCurrency &&
      conversionRateByTicker?.[nativeCurrency]?.conversionRate;

    if (!isNonEvm && !nativeTokenConversionRate) {
      return;
    }

    const fetchRate = async () => {
      try {
        const tokenFiatPrice = await getTokenExchangeRate({
          chainId,
          tokenAddress: itemAddress,
          currency: currentCurrency,
        });

        if (!tokenFiatPrice) {
          setFetchedRate(undefined);
          return;
        }

        if (isNonEvm) {
          setFetchedRate(tokenFiatPrice);
        } else if (nativeTokenConversionRate) {
          setFetchedRate(tokenFiatPrice / nativeTokenConversionRate);
        }
      } catch (error) {
        console.error('Failed to fetch token exchange rate:', error);
        setFetchedRate(undefined);
      }
    };

    fetchRate();
  }, [
    chainId,
    itemAddress,
    currentCurrency,
    marketDataRate,
    nativeCurrency,
    conversionRateByTicker,
  ]);

  const exchangeRate = marketDataRate ?? fetchedRate;

  let currentPrice = 0;
  let priceDiff = 0;
  let comparePrice = 0;

  if (isAssetFromSearch(token) && tokenResult?.found) {
    currentPrice = tokenResult.price?.price || 0;
  } else {
    const {
      currentPrice: calculatedPrice,
      priceDiff: calculatedPriceDiff,
      comparePrice: calculatedComparePrice,
    } = calculateAssetPrice({
      _asset: token,
      isEvmAssetSelected: !isNonEvmToken,
      exchangeRate,
      tickerConversionRate:
        conversionRateByTicker?.[nativeCurrency]?.conversionRate ?? undefined,
      prices,
      multichainAssetRates,
      timePeriod,
    });
    currentPrice = calculatedPrice;
    priceDiff = calculatedPriceDiff;
    comparePrice = calculatedComparePrice;
  }

  return {
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading,
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,
    currentCurrency,
  };
};

export default useTokenPrice;
