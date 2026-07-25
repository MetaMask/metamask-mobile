import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  CROSSMINT_STAGING_XMEME_LOCATOR,
  CROSSMINT_STAGING_XMEME_MARKET_DATA,
} from '../crossmint/constants';
import { crossmintLocatorToCaipAssetId } from '../crossmint/tokenLocator';
import type { CrossmintMemecoinToken } from '../crossmint/types';

const PRICE_API_BASE_URL = 'https://price.api.cx.metamask.io/v3/spot-prices';
const TOKENS_API_BASE_URL = 'https://tokens.api.cx.metamask.io/v3/assets';
const MAX_BATCH_SIZE = 25;

export interface MemecoinMarketData {
  price?: number;
  priceChange1d?: number;
  marketCap?: number;
  name?: string;
  symbol?: string;
  imageUrl?: string;
}

interface SpotPriceResponse {
  [assetId: string]: {
    price?: number;
    pricePercentChange1d?: number;
    marketCap?: number;
  } | null;
}

interface TokenMetadataResponseItem {
  assetId: string;
  name?: string;
  symbol?: string;
  iconUrl?: string;
}

function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
    chunks.push(ids.slice(i, i + MAX_BATCH_SIZE));
  }
  return chunks;
}

/**
 * Enriches Crossmint catalog tokens with MetaMask Price API spot prices /
 * 24h % change and Tokens API metadata (name, symbol, icon).
 *
 * Missing market data degrades gracefully (undefined → "—" in the UI).
 * Staging XMEME uses demo market data when Price API returns null.
 */
export function useMemecoinMarketData(tokens: CrossmintMemecoinToken[]): {
  marketDataByLocator: Record<string, MemecoinMarketData>;
  isMarketDataLoading: boolean;
} {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const [marketDataByLocator, setMarketDataByLocator] = useState<
    Record<string, MemecoinMarketData>
  >({});
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const tokenAssetPairs = useMemo(
    () =>
      tokens
        .map((token) => {
          const assetId = crossmintLocatorToCaipAssetId(token);
          return assetId ? { tokenLocator: token.tokenLocator, assetId } : null;
        })
        .filter(
          (pair): pair is { tokenLocator: string; assetId: string } =>
            pair !== null,
        ),
    [tokens],
  );

  const assetIdsKey = tokenAssetPairs.map((pair) => pair.assetId).join(',');

  const fetchMarketData = useCallback(async () => {
    if (tokenAssetPairs.length === 0) {
      setMarketDataByLocator({});
      setIsMarketDataLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    setIsMarketDataLoading(true);

    try {
      const assetIds = tokenAssetPairs.map((pair) => pair.assetId);
      const batches = chunkIds(assetIds);

      const [priceBatches, metadataBatches] = await Promise.all([
        Promise.all(
          batches.map(
            (batch) =>
              handleFetch(
                `${PRICE_API_BASE_URL}?${new URLSearchParams({
                  assetIds: batch.join(','),
                  includeMarketData: 'true',
                  vsCurrency: (currentCurrency || 'usd').toLowerCase(),
                })}`,
              ) as Promise<SpotPriceResponse>,
          ),
        ),
        Promise.all(
          batches.map(
            (batch) =>
              handleFetch(
                `${TOKENS_API_BASE_URL}?${new URLSearchParams({
                  assetIds: batch.join(','),
                  includeIconUrl: 'true',
                })}`,
              ) as Promise<TokenMetadataResponseItem[]>,
          ),
        ),
      ]);

      if (fetchId !== fetchIdRef.current) {
        return;
      }

      const prices = Object.assign({}, ...priceBatches) as SpotPriceResponse;
      const metadataByAssetId: Record<string, TokenMetadataResponseItem> = {};
      metadataBatches.flat().forEach((item) => {
        if (item?.assetId) {
          metadataByAssetId[item.assetId] = item;
          metadataByAssetId[item.assetId.toLowerCase()] = item;
        }
      });

      const next: Record<string, MemecoinMarketData> = {};
      tokenAssetPairs.forEach(({ tokenLocator, assetId }) => {
        const rawPriceEntry = prices[assetId] ?? prices[assetId.toLowerCase()];
        // Price API returns explicit `null` for unknown assets.
        const priceEntry =
          rawPriceEntry && typeof rawPriceEntry === 'object'
            ? rawPriceEntry
            : undefined;
        const metadata =
          metadataByAssetId[assetId] ??
          metadataByAssetId[assetId.toLowerCase()];

        const usedStagingFallback =
          !priceEntry && tokenLocator === CROSSMINT_STAGING_XMEME_LOCATOR;

        next[tokenLocator] = {
          price: usedStagingFallback
            ? CROSSMINT_STAGING_XMEME_MARKET_DATA.price
            : priceEntry?.price,
          priceChange1d: usedStagingFallback
            ? CROSSMINT_STAGING_XMEME_MARKET_DATA.priceChange1d
            : priceEntry?.pricePercentChange1d,
          marketCap: usedStagingFallback
            ? CROSSMINT_STAGING_XMEME_MARKET_DATA.marketCap
            : priceEntry?.marketCap,
          name: metadata?.name,
          symbol: metadata?.symbol,
          imageUrl: metadata?.iconUrl,
        };
      });

      setMarketDataByLocator(next);
    } catch {
      if (fetchId !== fetchIdRef.current) {
        return;
      }
      setMarketDataByLocator({});
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsMarketDataLoading(false);
      }
    }
  }, [currentCurrency, tokenAssetPairs]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData, assetIdsKey]);

  useEffect(
    () => () => {
      fetchIdRef.current += 1;
    },
    [],
  );

  return { marketDataByLocator, isMarketDataLoading };
}
