import { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import useEarnAssetCatalogue from '../../../../UI/Earn/hooks/useEarnAssetCatalogue';
import { getEarnAssetMetadata } from '../../../../UI/Earn/utils/earnAssets';
import { rankEarnAssets } from '../../../../UI/Earn/utils/earnSection';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { selectIsMoneyAccountVisible } from '../../../../UI/Money/selectors/visibility';
import type {
  EarnSearchFeedError,
  EarnSearchFeedResult,
  EarnSearchItem,
} from './earnSearchTypes';

interface UseEarnSearchFeedOptions {
  /** Text used to filter Earn asset metadata. */
  query?: string;
  /** Whether catalogue and Money balance queries are enabled. */
  enabled?: boolean;
}

/**
 * Provides Money and Earn asset results for Explore search.
 *
 * Catalogue failures are exposed through `error` with a retry callback; they
 * are not silently converted into an empty result set.
 *
 * @param options - Search text and enabled state for the feed.
 * @returns Search results and loading/error state.
 */
export const useEarnSearchFeed = ({
  query = '',
  enabled = true,
}: UseEarnSearchFeedOptions = {}): EarnSearchFeedResult => {
  const {
    assets,
    hasError,
    isLoading: isCatalogueLoading,
    moneyApyPercent,
    moneyRateStatus,
    refresh,
  } = useEarnAssetCatalogue({ enabled });
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const {
    totalFiatRaw: balanceRaw,
    totalFiatFormatted: balanceFiat,
    isBalanceLoading,
  } = useMoneyAccountBalance({
    enabled: enabled && isMoneyAccountVisible,
  });
  const retryInFlightRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const rankedAssets = useMemo(() => rankEarnAssets(assets), [assets]);

  const matchingAssets = useMemo(
    () =>
      rankedAssets.filter((asset) => {
        if (!normalizedQuery) return true;
        const metadata = getEarnAssetMetadata(asset);
        return [metadata.name, metadata.ticker, metadata.symbol].some((value) =>
          value?.toLowerCase().includes(normalizedQuery),
        );
      }),
    [normalizedQuery, rankedAssets],
  );

  const moneyItem = useMemo(
    () =>
      isMoneyAccountVisible
        ? {
            kind: 'money-account' as const,
            id: 'money-account' as const,
            balanceRaw,
            balanceFiat,
            isBalanceLoading,
            apyPercent: moneyApyPercent,
            rateStatus: moneyRateStatus,
          }
        : undefined,
    [
      balanceFiat,
      balanceRaw,
      isBalanceLoading,
      isMoneyAccountVisible,
      moneyApyPercent,
      moneyRateStatus,
    ],
  );

  const data = useMemo<EarnSearchItem[]>(
    () =>
      enabled
        ? [
            ...(moneyItem ? [moneyItem] : []),
            ...matchingAssets.map((asset) => ({
              kind: 'asset' as const,
              id: asset.assetId,
              asset,
            })),
          ]
        : [],
    [enabled, matchingAssets, moneyItem],
  );

  const retry = useCallback(async () => {
    if (retryInFlightRef.current) return;
    retryInFlightRef.current = true;
    setIsRetrying(true);
    try {
      await refresh();
    } catch (error: unknown) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'EarnSearch: Failed to refresh Earn data',
      );
      throw error;
    } finally {
      retryInFlightRef.current = false;
      setIsRetrying(false);
    }
  }, [refresh]);

  const error = useMemo<EarnSearchFeedError | undefined>(
    () =>
      enabled && hasError
        ? {
            message: strings('earn_module.assets_unavailable'),
            retry,
            isRetrying,
          }
        : undefined,
    [enabled, hasError, isRetrying, retry],
  );

  return useMemo(
    () => ({
      data,
      isLoading: enabled && isCatalogueLoading && data.length === 0,
      error,
    }),
    [data, enabled, error, isCatalogueLoading],
  );
};

export default useEarnSearchFeed;
