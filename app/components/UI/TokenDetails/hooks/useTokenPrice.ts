import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import useTokenHistoricalPrices, {
  DEFAULT_HISTORICAL_TIME_PERIOD,
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
import { type MarketDataDetails } from '@metamask/assets-controllers';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import { spotPriceQueryOptions } from '../queries/spotPriceQuery';

/**
 * Time ranges where the spot-prices API provides a reliable pre-computed
 * percentage, mapped to the corresponding MarketDataDetails field.
 * Ranges not covered here (3m, 3y, all) have no matching API field and
 * will fall back to the historical-prices-derived percentage.
 */
const SPOT_PRICE_PCT_BY_TIME_PERIOD: Partial<
  Record<TimePeriod, keyof MarketDataDetails>
> = {
  '1d': 'pricePercentChange1d',
  '1w': 'pricePercentChange7d',
  '7d': 'pricePercentChange7d',
  '1m': 'pricePercentChange30d',
  '1y': 'pricePercentChange1y',
};

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
  hasInsufficientCoverage: boolean;
  historicalPricesApiMs: number | undefined;
  exchangeRateApiMs: number | undefined;
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

  const [timePeriod, setTimePeriod] = useState<TimePeriod>(
    DEFAULT_HISTORICAL_TIME_PERIOD,
  );

  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allTokenMarketData = useSelector(selectTokenMarketData);

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );

  const tokenResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, chainId, token.address as Hex),
  );

  const itemAddress = !isNonEvmToken
    ? safeToChecksumAddress(token.address)
    : token.address;

  const {
    data: prices = [],
    isLoading,
    hasInsufficientCoverage,
    apiDurationMs: historicalPricesApiMs,
  } = useTokenHistoricalPrices({
    asset: token,
    address: token.address as Hex,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  const chartNavigationButtons: TimePeriod[] = useMemo(
    () =>
      !isNonEvmToken
        ? ['1d', '1w', '1m', '3m', '1y', '3y']
        : ['1d', '1w', '1m', '3m', '1y', 'all'],
    [isNonEvmToken],
  );

  const tokenMarketEntry = allTokenMarketData?.[chainId]?.[itemAddress as Hex];
  const marketDataRate = tokenMarketEntry?.price;

  const isNonEvm = isNonEvmChainId(chainId);
  const nativeTokenConversionRate =
    nativeCurrency && conversionRateByTicker?.[nativeCurrency]?.conversionRate;

  const shouldFetchSpot =
    marketDataRate === undefined &&
    Boolean(itemAddress) &&
    (isNonEvm || Boolean(nativeTokenConversionRate));

  const spotQuery = useQuery({
    ...spotPriceQueryOptions({
      chainId,
      tokenAddress: itemAddress ?? '',
      currency: currentCurrency,
    }),
    enabled: shouldFetchSpot,
  });

  const fetchedMarketData: MarketDataDetails | undefined = shouldFetchSpot
    ? spotQuery.data?.marketData
    : ({} as MarketDataDetails);

  const exchangeRateApiMs = shouldFetchSpot
    ? spotQuery.data?.apiDurationMs
    : undefined;

  let fetchedRate: number | undefined;
  const spotMarketData = shouldFetchSpot
    ? spotQuery.data?.marketData
    : undefined;
  if (spotMarketData?.price) {
    if (isNonEvm) {
      fetchedRate = spotMarketData.price;
    } else if (nativeTokenConversionRate) {
      fetchedRate = spotMarketData.price / nativeTokenConversionRate;
    }
  }

  // For time periods that use spot-prices percentage (1d, 1w, 1m, 1y),
  // wait for spot-prices to load before showing data to avoid flicker.
  // For other periods (3m, 3y, all), we must rely on historical prices.
  const spotPctField = SPOT_PRICE_PCT_BY_TIME_PERIOD[timePeriod];
  const needsSpotPriceFetch = marketDataRate === undefined && !!itemAddress;
  // Wait for spot-prices data when: token not in Redux, time period uses spot %,
  // and we haven't fetched yet (fetchedMarketData is still undefined).
  const isWaitingForSpotPrice =
    needsSpotPriceFetch &&
    spotPctField !== undefined &&
    fetchedMarketData === undefined;

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

  // When the spot-prices API has a pre-computed percentage for the active
  // time range, prefer it over the percentage derived from historical-prices.
  // The historical-prices endpoint can return incomplete data for newly-listed
  // tokens (e.g., only 6h of data when 24h is requested), causing wildly
  // incorrect percentages.
  // For imported tokens, read from Redux (tokenMarketEntry); for non-imported
  // tokens, fall back to the fetched market data.
  const spotPct = spotPctField
    ? ((tokenMarketEntry?.[spotPctField] as number | undefined) ??
      (fetchedMarketData?.[spotPctField] as number | undefined) ??
      null)
    : null;

  if (spotPct != null && currentPrice > 0) {
    const derivedComparePrice = currentPrice / (1 + spotPct / 100);
    comparePrice = derivedComparePrice;
    priceDiff = currentPrice - derivedComparePrice;
  }

  // Combine loading states: wait for both historical prices AND spot-prices
  // (when needed for the current time period) to avoid percentage flicker.
  const combinedIsLoading = isLoading || isWaitingForSpotPrice;

  return {
    currentPrice,
    priceDiff,
    comparePrice,
    prices,
    isLoading: combinedIsLoading,
    timePeriod,
    setTimePeriod,
    chartNavigationButtons,
    currentCurrency,
    hasInsufficientCoverage,
    historicalPricesApiMs,
    exchangeRateApiMs,
  };
};

export default useTokenPrice;
