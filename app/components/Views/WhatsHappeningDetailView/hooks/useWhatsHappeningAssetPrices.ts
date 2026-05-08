import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { usePerpsLivePrices } from '../../../UI/Perps/hooks/stream';

export interface TokenPriceEntry {
  price: number | undefined;
  pricePercentChange1d: number | undefined;
}

export interface PerpsPriceEntry {
  price: number | undefined;
  percentChange24h: number | undefined;
}

export interface UseWhatsHappeningAssetPricesResult {
  /** Map from caip19 asset ID → price data */
  tokenPriceByCaip: Record<string, TokenPriceEntry>;
  /** Map from HyperLiquid perps symbol → price data */
  perpsPriceBySymbol: Record<string, PerpsPriceEntry>;
}

interface PriceApiResponse {
  [assetId: string]: {
    price?: number;
    pricePercentChange1d?: number;
  };
}

/**
 * Fetches and returns live price data for all assets related to a "What's Happening"
 * card item. Token prices come from the MetaMask Price API (batched); perps prices
 * come from the live WebSocket stream via `usePerpsLivePrices`.
 *
 * The hook is designed to be called once per expanded card so that only
 * visible cards trigger fetches and subscriptions.
 */
export function useWhatsHappeningAssetPrices(
  item: WhatsHappeningItem,
): UseWhatsHappeningAssetPricesResult {
  const currentCurrency = useSelector(selectCurrentCurrency);

  // Deduplicated list of caip19 IDs for token price fetching
  const tokenCaip19s = useMemo(
    () => [...new Set(item.relatedAssets.flatMap((a) => a.caip19 ?? []))],
    [item.relatedAssets],
  );

  // Deduplicated list of perps symbols for live price subscription
  const perpsSymbols = useMemo(
    () => [
      ...new Set(item.relatedAssets.flatMap((a) => a.hlPerpsMarket ?? [])),
    ],
    [item.relatedAssets],
  );

  const [tokenPriceByCaip, setTokenPriceByCaip] = useState<
    Record<string, TokenPriceEntry>
  >({});

  // Track the latest fetch to discard stale responses
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (tokenCaip19s.length === 0) {
      setTokenPriceByCaip({});
      return;
    }

    const fetchId = ++fetchIdRef.current;

    const fetchPrices = async () => {
      try {
        const assetIds = tokenCaip19s.join(',');
        const url = `https://price.api.cx.metamask.io/v3/spot-prices?${new URLSearchParams(
          {
            assetIds,
            includeMarketData: 'true',
            vsCurrency: currentCurrency.toLowerCase(),
          },
        )}`;

        const response = (await handleFetch(url)) as PriceApiResponse;

        if (fetchId !== fetchIdRef.current) return;

        const map: Record<string, TokenPriceEntry> = {};
        for (const caip of tokenCaip19s) {
          const entry = response[caip];
          map[caip] = {
            price: entry?.price,
            pricePercentChange1d: entry?.pricePercentChange1d,
          };
        }
        setTokenPriceByCaip(map);
      } catch {
        if (fetchId !== fetchIdRef.current) return;
        // On error, keep existing state — shows "—" in the UI
        setTokenPriceByCaip({});
      }
    };

    fetchPrices();
  }, [tokenCaip19s, currentCurrency]);

  // Invalidate any in-flight fetch on unmount
  useEffect(
    () => () => {
      fetchIdRef.current++;
    },
    [],
  );

  // Live perps prices via WebSocket
  const livePerpsPrices = usePerpsLivePrices({
    symbols: perpsSymbols,
    throttleMs: 3000,
  });

  const perpsPriceBySymbol = useMemo<Record<string, PerpsPriceEntry>>(() => {
    const map: Record<string, PerpsPriceEntry> = {};
    for (const symbol of perpsSymbols) {
      const liveEntry = livePerpsPrices[symbol];
      if (!liveEntry) {
        map[symbol] = { price: undefined, percentChange24h: undefined };
        continue;
      }
      const rawPrice = parseFloat(liveEntry.price);
      const rawChange = liveEntry.percentChange24h
        ? parseFloat(liveEntry.percentChange24h)
        : undefined;
      map[symbol] = {
        price: isNaN(rawPrice) ? undefined : rawPrice,
        percentChange24h:
          rawChange !== undefined && isNaN(rawChange) ? undefined : rawChange,
      };
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perpsSymbols, livePerpsPrices]);

  return { tokenPriceByCaip, perpsPriceBySymbol };
}
