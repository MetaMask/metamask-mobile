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
import { usePerpsChartData } from './usePerpsChartData';

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
  /** Whether the chart is showing real-time perps data */
  isRealtime: boolean;
  /** Whether a perps market exists for this token */
  hasPerpsMarket: boolean;
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
 *
 * When a token has a corresponding HyperLiquid perpetual market, this hook
 * will use real-time WebSocket data for the price chart. Otherwise, it falls
 * back to historical API data.
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

  // Fetch real-time perps data when available
  const {
    hasPerpsMarket,
    isMarketLoading,
    prices: perpsPrices,
    isLoading: isPerpsLoading,
    currentPrice: perpsCurrentPrice,
    priceDiff: perpsPriceDiff,
    comparePrice: perpsComparePrice,
    isRealtime,
  } = usePerpsChartData({
    symbol: token.symbol,
    timePeriod,
  });

  // Fetch historical API data as fallback
  const { data: apiPrices = [], isLoading: isApiLoading } =
    useTokenHistoricalPrices({
      asset: token,
      address: token.address as Hex,
      chainId,
      timePeriod,
      vsCurrency: currentCurrency,
    });

  // Simple logic: wait for market check, then use appropriate data source
  const usePerpsData = hasPerpsMarket && perpsPrices.length > 0;
  const prices = usePerpsData ? perpsPrices : apiPrices;

  // Show loading until we know which data source to use
  const isLoading =
    isMarketLoading || (hasPerpsMarket ? isPerpsLoading : isApiLoading);

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

  // When using perps data, use the price values from perps
  if (usePerpsData) {
    currentPrice = perpsCurrentPrice;
    priceDiff = perpsPriceDiff;
    comparePrice = perpsComparePrice;
  } else if (isAssetFromSearch(token) && tokenResult?.found) {
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
      prices: apiPrices,
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
    isRealtime: usePerpsData && isRealtime,
    hasPerpsMarket,
  };
};

export default useTokenPrice;
