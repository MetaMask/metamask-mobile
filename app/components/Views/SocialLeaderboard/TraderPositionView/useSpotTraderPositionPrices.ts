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
import { useNetworkQuery } from '../../../../core/Networking/useNetworkQuery';
import { PERIOD_TO_API, type TimePeriod } from './traderPositionData';

/**
 * Price API v3 root. Declared once so the spot-price and historical-price
 * requests below cannot drift apart.
 */
const PRICE_API_V3_BASE_URL = 'https://price.api.cx.metamask.io/v3';

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

function isNumeric(value: unknown): value is number | string {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string' || value.trim() === '') return false;
  return Number.isFinite(Number(value));
}

function parseHistoricalPrices(body: unknown): TokenPrice[] {
  if (body === null) return [];
  if (
    typeof body !== 'object' ||
    !('prices' in body) ||
    !Array.isArray(body.prices)
  ) {
    throw new Error('Expected a historical price series');
  }
  return body.prices.map((point: unknown): TokenPrice => {
    if (!Array.isArray(point)) throw new Error('Expected a price point');
    const [timestamp, price]: unknown[] = point;
    if (!isNumeric(timestamp))
      throw new Error('Invalid historical price timestamp');
    if (!isNumeric(price)) throw new Error('Invalid historical price');
    return [String(timestamp), Number(price)];
  });
}

function useHistoricalPeriod(
  seriesUrl: string,
  currency: string,
  period: TimePeriod,
  enabled: boolean,
) {
  const params = new URLSearchParams({
    timePeriod: PERIOD_TO_API[period],
    vsCurrency: currency,
  });
  const url = `${seriesUrl}?${params.toString()}`;
  return useNetworkQuery({
    queryKey: ['social-spot-history', seriesUrl, currency, period],
    url,
    parse: parseHistoricalPrices,
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useSpotTraderPositionPrices(
  { positionParam, caipChainId }: SpotTraderPositionPricesParams,
  { enabled }: SpotTraderPositionPricesOptions,
): SpotTraderPositionPricesResult {
  const hexChainId = useMemo(
    () => (caipChainId ? caipChainIdToHex(caipChainId) : undefined),
    [caipChainId],
  );

  // Live revisions hand over a new `Position` for the same token, so the
  // fetches key on the address rather than the object.
  const tokenAddress = positionParam?.tokenAddress;

  const allMarketData = useSelector(selectTokenMarketData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const cachedMarket = hexChainId
    ? allMarketData?.[hexChainId]?.[tokenAddress?.toLowerCase() as Hex]
    : undefined;

  const [fetchedMarketCap, setFetchedMarketCap] = useState<number>();

  useEffect(() => {
    setFetchedMarketCap(undefined);

    if (
      !enabled ||
      cachedMarket?.marketCap != null ||
      tokenAddress === undefined ||
      !caipChainId
    ) {
      return;
    }
    const assetId = toAssetId(tokenAddress, caipChainId);
    if (!assetId) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `${PRICE_API_V3_BASE_URL}/spot-prices?${new URLSearchParams(
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
    tokenAddress,
    caipChainId,
    currentCurrency,
  ]);

  const marketCap = cachedMarket?.marketCap ?? fetchedMarketCap;

  const hasAsset = Boolean(tokenAddress && caipChainId);
  const historyEnabled = enabled && hasAsset;
  const seriesUrl = `${PRICE_API_V3_BASE_URL}/historical-prices/${caipChainId}/erc20:${tokenAddress}`;
  const currency = currentCurrency.toLowerCase();
  const day = useHistoricalPeriod(seriesUrl, currency, '1D', historyEnabled);
  const week = useHistoricalPeriod(seriesUrl, currency, '1W', historyEnabled);
  const month = useHistoricalPeriod(seriesUrl, currency, '1M', historyEnabled);
  const all = useHistoricalPeriod(seriesUrl, currency, 'All', historyEnabled);
  const pricesByPeriod =
    useMemo((): SpotTraderPositionPricesResult['pricesByPeriod'] => {
      if (!historyEnabled) return {};
      return {
        '1H': day.data ?? [],
        '1D': day.data ?? [],
        '1W': week.data ?? [],
        '1M': month.data ?? [],
        All: all.data ?? [],
      };
    }, [historyEnabled, day.data, week.data, month.data, all.data]);
  const isLoading =
    historyEnabled && [day, week, month, all].some((query) => query.isLoading);

  return {
    pricesByPeriod,
    isLoading,
    marketCap: enabled ? marketCap : undefined,
  };
}
