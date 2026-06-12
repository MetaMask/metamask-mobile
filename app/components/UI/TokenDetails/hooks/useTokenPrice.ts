import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
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
import { type MarketDataDetails } from '@metamask/assets-controllers';
import { getTokenExchangeRate } from '../../Bridge/utils/exchange-rates';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { safeToChecksumAddress } from '../../../../util/address';

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

  const [fetchedRate, setFetchedRate] = useState<number | undefined>();
  const [fetchedMarketData, setFetchedMarketData] = useState<
    MarketDataDetails | undefined
  >();
  const fetchIdRef = useRef(0);

  // For non-imported tokens (not in Redux), fetch price + market data in a
  // single call. This gives us both the exchange rate and the pre-computed
  // percentage changes from the spot-prices API, avoiding the historical-prices
  // endpoint's incomplete-data problem for newly-listed tokens.
  useEffect(() => {
    setFetchedRate(undefined);
    setFetchedMarketData(undefined);

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

    const id = ++fetchIdRef.current;

    const fetchData = async () => {
      try {
        const data = (await getTokenExchangeRate({
          chainId,
          tokenAddress: itemAddress,
          currency: currentCurrency,
          includeMarketData: true,
        })) as MarketDataDetails | undefined;

        if (id !== fetchIdRef.current) return;

        if (!data?.price) {
          setFetchedRate(undefined);
          setFetchedMarketData(undefined);
          return;
        }

        setFetchedMarketData(data);

        if (isNonEvm) {
          setFetchedRate(data.price);
        } else if (nativeTokenConversionRate) {
          setFetchedRate(data.price / nativeTokenConversionRate);
        }
      } catch {
        if (id !== fetchIdRef.current) return;
        setFetchedRate(undefined);
        setFetchedMarketData(undefined);
      }
    };

    fetchData();
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

  // When the spot-prices API has a pre-computed percentage for the active
  // time range, prefer it over the percentage derived from historical-prices.
  // The historical-prices endpoint can return incomplete data for newly-listed
  // tokens (e.g., only 6h of data when 24h is requested), causing wildly
  // incorrect percentages.
  // For imported tokens, read from Redux (tokenMarketEntry); for non-imported
  // tokens, fall back to the fetched market data.
  const spotPctField = SPOT_PRICE_PCT_BY_TIME_PERIOD[timePeriod];
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
    hasInsufficientCoverage,
  };
};

export default useTokenPrice;
