import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import type { CaipAssetType } from '@metamask/utils';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { getAssetsPrice } from '../../../../selectors/assets/assets-controller';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import Logger from '../../../../util/Logger';

const SPOT_PRICES_URL = 'https://price.api.cx.metamask.io/v3/spot-prices';

export interface UseTokenMarketDataResult {
  /** Null until resolved, and when the token has no market data at all. */
  marketData: FungibleAssetPrice | null;
  /** True only while the network fallback is in flight. */
  isLoading: boolean;
}

/**
 * Market data for a token, from the unified `AssetsController` where the asset
 * is already tracked and from the price API where it is not.
 *
 * Reads `assetsPrice` directly rather than through `selectTokenMarketData`.
 * That selector is a `TokenRatesController` compatibility shim which divides
 * every currency field by the native conversion rate, so consumers have to
 * multiply it back up and track which source they read. `assetsPrice` holds
 * the API's own values in the user's selected currency, and a spot-prices
 * fetch with `vsCurrency` returns the same `FungibleAssetPrice` shape in that
 * same currency. Cache hit and fetch miss are therefore interchangeable and
 * nothing here converts between denominations.
 *
 * The fallback matters because `assetsPrice` only covers assets the controller
 * tracks: balances, imported tokens, and explicit price refreshes. A token
 * opened from Explore, Trending or Search is absent from it, and those are
 * exactly the entry points Token Details V1 has to support.
 *
 * `usdPrice` is the one field not denominated in the selected currency. It is
 * always USD, which makes it the right numerator for ratios against other USD
 * figures such as the security data's `reserveUSD`.
 *
 * @param assetId - CAIP-19 asset ID. No fetch is attempted when null.
 */
export const useTokenMarketData = (
  assetId: CaipAssetType | null,
): UseTokenMarketDataResult => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const assetsPrice = useSelector(getAssetsPrice);

  const cachedPrice = assetId ? assetsPrice?.[assetId] : undefined;
  const cachedMarketData =
    cachedPrice?.assetPriceType === 'fungible' ? cachedPrice : undefined;

  const [fetchedMarketData, setFetchedMarketData] =
    useState<FungibleAssetPrice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Discards responses from a superseded asset or currency rather than letting
  // a slow earlier request overwrite a newer one.
  const fetchIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchMarketData = useCallback(
    async (fetchId: number) => {
      if (!assetId) {
        return;
      }

      try {
        const url = `${SPOT_PRICES_URL}?${new URLSearchParams({
          assetIds: assetId,
          includeMarketData: 'true',
          vsCurrency: currentCurrency.toLowerCase(),
        })}`;

        const response = (await handleFetch(url)) as Record<
          string,
          FungibleAssetPrice | undefined
        >;

        if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
          return;
        }

        setFetchedMarketData(response?.[assetId] ?? null);
      } catch (error) {
        if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
          return;
        }

        Logger.error(error as Error, 'useTokenMarketData: spot-prices failed');
        setFetchedMarketData(null);
      } finally {
        if (isMountedRef.current && fetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [assetId, currentCurrency],
  );

  // Reduced to its presence so a price tick on an already-cached asset does
  // not restart the effect for no new information. `fetchMarketData` changes
  // identity with the asset and currency, which covers both of those.
  const hasCachedMarketData = Boolean(cachedMarketData);

  useEffect(() => {
    isMountedRef.current = true;

    // Invalidates any in-flight request for a previous asset or currency.
    const fetchId = ++fetchIdRef.current;
    setFetchedMarketData(null);

    if (!assetId || hasCachedMarketData) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
      fetchMarketData(fetchId);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [assetId, hasCachedMarketData, fetchMarketData]);

  return {
    marketData: cachedMarketData ?? fetchedMarketData,
    isLoading,
  };
};

export default useTokenMarketData;
