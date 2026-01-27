import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { CurrencyRateState } from '@metamask/assets-controllers';
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
  exchangeRate: number | undefined;
  marketDataRate: number | undefined;
  nativeCurrency: string;
  currentCurrency: string;
  conversionRateByTicker: CurrencyRateState['currencyRates'] | undefined;
  itemAddress: string | undefined;
}

export interface UseTokenPriceParams {
  asset: TokenI;
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
  asset,
  multichainAssetRates,
}: UseTokenPriceParams): UseTokenPriceResult => {
  const chainId = asset.chainId as Hex;

  // Determine if asset is EVM or non-EVM
  const resultChainId = formatChainIdToCaip(chainId);
  const isNonEvmAsset = resultChainId === asset.chainId;

  // Time period state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1d');

  // Selectors
  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allTokenMarketData = useSelector(selectTokenMarketData);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );

  const tokenResult = useSelector((state: RootState) =>
    selectTokenDisplayData(state, chainId, asset.address as Hex),
  );

  // Calculate item address
  const itemAddress = !isNonEvmAsset
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  const currentAddress = asset.address as Hex;

  // Historical prices
  const { data: prices = [], isLoading } = useTokenHistoricalPrices({
    asset,
    address: currentAddress,
    chainId,
    timePeriod,
    vsCurrency: currentCurrency,
  });

  // Fetch swaps tokens on mount
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

  // Chart navigation buttons based on asset type
  const chartNavigationButtons: TimePeriod[] = useMemo(
    () =>
      !isNonEvmAsset
        ? ['1d', '1w', '1m', '3m', '1y', '3y']
        : ['1d', '1w', '1m', '3m', '1y', 'all'],
    [isNonEvmAsset],
  );

  const currentChainId = chainId as Hex;
  const marketDataRate =
    allTokenMarketData?.[currentChainId]?.[itemAddress as Hex]?.price;

  // Fetch exchange rate if not available in cache
  const [fetchedRate, setFetchedRate] = useState<number | undefined>();

  useEffect(() => {
    if (marketDataRate !== undefined || !itemAddress) {
      return;
    }

    const isNonEvm = isNonEvmChainId(currentChainId);
    const nativeAssetConversionRate =
      nativeCurrency &&
      conversionRateByTicker?.[nativeCurrency]?.conversionRate;

    if (!isNonEvm && !nativeAssetConversionRate) {
      return;
    }

    const fetchRate = async () => {
      try {
        const tokenFiatPrice = await getTokenExchangeRate({
          chainId: currentChainId,
          tokenAddress: itemAddress,
          currency: currentCurrency,
        });

        if (!tokenFiatPrice) {
          setFetchedRate(undefined);
          return;
        }

        if (isNonEvm) {
          setFetchedRate(tokenFiatPrice);
        } else if (nativeAssetConversionRate) {
          setFetchedRate(tokenFiatPrice / nativeAssetConversionRate);
        }
      } catch (error) {
        console.error('Failed to fetch token exchange rate:', error);
        setFetchedRate(undefined);
      }
    };

    fetchRate();
  }, [
    currentChainId,
    itemAddress,
    currentCurrency,
    marketDataRate,
    nativeCurrency,
    conversionRateByTicker,
  ]);

  const exchangeRate = marketDataRate ?? fetchedRate;

  // Calculate price data
  let currentPrice = 0;
  let priceDiff = 0;
  let comparePrice = 0;

  if (isAssetFromSearch(asset) && tokenResult?.found) {
    currentPrice = tokenResult.price?.price || 0;
  } else {
    const {
      currentPrice: calculatedPrice,
      priceDiff: calculatedPriceDiff,
      comparePrice: calculatedComparePrice,
    } = calculateAssetPrice({
      _asset: asset,
      isEvmAssetSelected: !isNonEvmAsset,
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
    exchangeRate,
    marketDataRate,
    nativeCurrency,
    currentCurrency,
    conversionRateByTicker,
    itemAddress,
  };
};

export default useTokenPrice;
