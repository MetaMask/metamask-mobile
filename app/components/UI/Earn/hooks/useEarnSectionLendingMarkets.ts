import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { LendingMarket } from '@metamask/stake-sdk';
import Engine from '../../../../core/Engine';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import Logger from '../../../../util/Logger';

interface UseEarnSectionLendingMarketsOptions {
  enabled: boolean;
}

/**
 * Provides lending markets with request-scoped loading and error state.
 *
 * EarnController's root `lastUpdated` field is not updated when lending
 * markets refresh, so consumers must not use it as a loading signal.
 */
const useEarnSectionLendingMarkets = ({
  enabled,
}: UseEarnSectionLendingMarketsOptions) => {
  const markets = useSelector(earnSelectors.selectAllLendingMarkets);
  const [isLoading, setIsLoading] = useState(enabled && markets.length === 0);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);
    try {
      await Engine.context.EarnController.refreshLendingMarkets();
    } catch (refreshError: unknown) {
      const requestError =
        refreshError instanceof Error
          ? refreshError
          : new Error('Failed to refresh Earn lending markets');
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setError(null);
      return;
    }
    if (markets.length > 0) return;

    refresh().catch((refreshError: unknown) => {
      Logger.error(
        refreshError as Error,
        'Failed to refresh Earn lending markets',
      );
    });
  }, [enabled, markets.length, refresh]);

  return {
    markets: markets as LendingMarket[],
    isLoading,
    error,
    refresh,
  };
};

export default useEarnSectionLendingMarkets;
