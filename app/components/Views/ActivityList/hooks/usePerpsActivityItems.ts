/**
 * Maps perps history from the Activity infinite query into `ActivityListItem`s.
 *
 * Open orders and unrecognized trades map to `null` and are dropped.
 */
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { InitializationState } from '@metamask/perps-controller';
import { selectSelectedAccountCaipId } from '../../../../selectors/activity';
import type { RootState } from '../../../../reducers';
import {
  selectPerpsInitializationState,
  selectPerpsNetwork,
} from '../../../UI/Perps/selectors/perpsController';
import {
  getPerpsActivityMappingIds,
  mapPerpsTransaction,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths
import { usePerpsActivityQuery } from '../../ActivityDetails/hooks/usePerpsActivityQuery';

export function usePerpsActivityItems({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { chainId, collateralAssetId } = getPerpsActivityMappingIds(
    useSelector(selectPerpsNetwork) === 'testnet',
  );
  const accountId = useSelector((state: RootState) =>
    selectSelectedAccountCaipId(state, chainId),
  );
  const isInitialized =
    useSelector(selectPerpsInitializationState) ===
    InitializationState.Initialized;
  const {
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    transactions,
  } = usePerpsActivityQuery(accountId, enabled && isInitialized);

  const items = useMemo(() => {
    const result: ActivityListItem[] = [];
    for (const transaction of transactions) {
      const item = mapPerpsTransaction({
        transaction,
        chainId,
        collateralAssetId,
      });
      if (item) {
        result.push(item);
      }
    }
    return result;
  }, [chainId, collateralAssetId, transactions]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    items,
    isLoading: (enabled && !isInitialized) || isLoading,
    error: error ? error.message : null,
    refetch,
    loadMore,
    hasMore: Boolean(hasNextPage),
    isFetchingMore: isFetchingNextPage,
  };
}
