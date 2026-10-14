import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { getAssetsPrice } from '../../../../selectors/assets/assets-controller';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import Logger from '../../../../util/Logger';
import { tokenMarketDataOptions } from '../queries/tokenMarketData';

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
 * The controller cache wins over the query rather than seeding it, because the
 * two have different lifetimes: `assetsPrice` keeps arriving from the
 * controller's own polling, so writing it into the query cache would leave two
 * copies to reconcile on every tick.
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

  // The currency is part of the request, not a detail of it: the response is
  // denominated in whatever `vsCurrency` asked for. Until it is known there is
  // nothing worth asking, so this waits rather than fetching figures it could
  // not label.
  const { data, isLoading, error } = useQuery({
    ...tokenMarketDataOptions(assetId, currentCurrency),
    enabled: Boolean(assetId) && Boolean(currentCurrency) && !cachedMarketData,
  });

  // Reported here rather than from the `queryFn` so a transient failure that
  // the retries then recover from stays out of Sentry — only a query that
  // settles into an error state is worth a report. React Query removed the
  // per-query `onError` callback in v5, so an effect is the remaining seam.
  useEffect(() => {
    if (error) {
      Logger.error(error, 'useTokenMarketData: spot-prices failed');
    }
  }, [error]);

  return {
    marketData: cachedMarketData ?? data ?? null,
    isLoading,
  };
};

export default useTokenMarketData;
