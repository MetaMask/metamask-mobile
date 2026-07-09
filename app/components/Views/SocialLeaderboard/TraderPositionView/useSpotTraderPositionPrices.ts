import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import type { CaipChainId, Hex } from '@metamask/utils';
import { handleFetch } from '@metamask/controller-utils';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { caipChainIdToHex } from '../../../UI/Rewards/utils/formatUtils';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import Logger from '../../../../util/Logger';
import { PERIOD_TO_API, type TimePeriod } from './traderPositionData';

export interface SpotTraderPositionPricesParams {
  positionParam: Position | undefined;
  caipChainId: CaipChainId | undefined;
}

export interface SpotTraderPositionPricesOptions {
  enabled: boolean;
}

export interface SpotTraderPositionPricesResult {
  pricesByPeriod: Partial<Record<TimePeriod, TokenPrice[]>>;
  isLoading: boolean;
  marketCap: number | undefined;
}

export function useSpotTraderPositionPrices(
  { positionParam, caipChainId }: SpotTraderPositionPricesParams,
  { enabled }: SpotTraderPositionPricesOptions,
): SpotTraderPositionPricesResult {
  const hexChainId = useMemo(
    () => (caipChainId ? caipChainIdToHex(caipChainId) : undefined),
    [caipChainId],
  );

  const allMarketData = useSelector(selectTokenMarketData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const cachedMarket = hexChainId
    ? allMarketData?.[hexChainId]?.[
        positionParam?.tokenAddress?.toLowerCase() as Hex
      ]
    : undefined;

  const [fetchedMarketCap, setFetchedMarketCap] = useState<number>();

  useEffect(() => {
    setFetchedMarketCap(undefined);

    if (
      !enabled ||
      cachedMarket?.marketCap != null ||
      !positionParam ||
      !caipChainId
    ) {
      return;
    }
    const assetId = toAssetId(positionParam.tokenAddress, caipChainId);
    if (!assetId) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `https://price.api.cx.metamask.io/v3/spot-prices?${new URLSearchParams(
          {
            assetIds: assetId,
            includeMarketData: 'true',
            vsCurrency: currentCurrency.toLowerCase(),
          },
        )}`;
        const response = (await handleFetch(url)) as Record<
          string,
          Record<string, unknown>
        >;
        const cap = response?.[assetId]?.marketCap;
        if (!cancelled && typeof cap === 'number') {
          setFetchedMarketCap(cap);
        }
      } catch (err) {
        Logger.error(
          err as Error,
          'useSpotTraderPositionPrices: failed to fetch market data',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    cachedMarket?.marketCap,
    positionParam,
    caipChainId,
    currentCurrency,
  ]);

  const marketCap = cachedMarket?.marketCap ?? fetchedMarketCap;

  const [pricesByPeriod, setPricesByPeriod] = useState<
    Partial<Record<TimePeriod, TokenPrice[]>>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!positionParam) {
      setPricesByPeriod({});
      setIsLoading(false);
      return;
    }

    if (!caipChainId) {
      setPricesByPeriod({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    const assetIdentifier = `erc20:${positionParam.tokenAddress}`;
    const vsCurrency = currentCurrency.toLowerCase();

    const fetchPeriod = async (period: TimePeriod) => {
      const apiPeriod = PERIOD_TO_API[period];
      const uri = `https://price.api.cx.metamask.io/v3/historical-prices/${caipChainId}/${assetIdentifier}?timePeriod=${apiPeriod}&vsCurrency=${vsCurrency}`;
      try {
        const response = await fetch(uri);
        if (response.status === 204 || !response.ok)
          return { period, prices: [] as TokenPrice[] };
        const data: { prices: [number, number][] } = await response.json();
        const prices: TokenPrice[] = (data.prices ?? []).map(
          ([timestamp, price]) =>
            [timestamp.toString(), Number(price)] as TokenPrice,
        );
        return { period, prices };
      } catch (err) {
        Logger.error(
          err as Error,
          `useSpotTraderPositionPrices: failed to fetch ${period} prices`,
        );
        return { period, prices: [] as TokenPrice[] };
      }
    };

    const uniquePeriods: TimePeriod[] = ['1D', '1W', '1M', 'All'];

    Promise.all(uniquePeriods.map(fetchPeriod)).then((results) => {
      if (cancelled) return;
      const cache: Partial<Record<TimePeriod, TokenPrice[]>> = {};
      for (const { period, prices } of results) {
        cache[period] = prices;
        if (period === '1D') cache['1H'] = prices;
      }
      setPricesByPeriod(cache);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, positionParam, caipChainId, currentCurrency]);

  return {
    pricesByPeriod,
    isLoading: enabled ? isLoading : false,
    marketCap: enabled ? marketCap : undefined,
  };
}
