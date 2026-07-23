import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CaipAssetType } from '@metamask/utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  getWatchlistAssetType,
  WatchlistAnalytics,
} from '../../constants/watchlistAnalytics';
import {
  createDraftFromTokens,
  deriveDisplayTokens,
  getStorageOrderFromDraft,
  getTokenAssetIdOrder,
  hasOrderChanged,
  normalizeAssetId,
  ordersMatch,
  removeFromDraftOrder,
  reorderDraftOrder,
  type WatchlistEditDraft,
} from './watchlistEditDraft.utils';

interface UseWatchlistEditDraftParams {
  queryTokens: TrendingAsset[];
  updateListMutation: {
    mutate: (
      assetIds: CaipAssetType[],
      options?: {
        onError?: () => void;
        onSettled?: () => void;
        onSuccess?: () => void;
      },
    ) => void;
  };
}

interface UseWatchlistEditDraftResult {
  isEditMode: boolean;
  displayTokens: TrendingAsset[];
  handleEditPress: () => void;
  handleDonePress: () => void;
  handleReorder: (event: ReorderableListReorderEvent) => void;
  onRemoveFromDraft: (assetId: string) => void;
}

export const useWatchlistEditDraft = ({
  queryTokens,
  updateListMutation,
}: UseWatchlistEditDraftParams): UseWatchlistEditDraftResult => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [draft, setDraft] = useState<WatchlistEditDraft | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const baselineOrderRef = useRef<string[]>([]);

  const queryAssetIdSet = useMemo(
    () =>
      new Set(
        queryTokens.map((token) => normalizeAssetId(String(token.assetId))),
      ),
    [queryTokens],
  );

  const displayTokens = useMemo(
    () => deriveDisplayTokens(queryTokens, draft),
    [draft, queryTokens],
  );

  useEffect(() => {
    if (!isEditMode && draft !== null) {
      if (!hasOrderChanged(draft.order, queryTokens, queryAssetIdSet)) {
        setDraft(null);
      }
    }
  }, [draft, isEditMode, queryAssetIdSet, queryTokens]);

  const trackRemovedTokens = useCallback(
    (storageOrder: string[]) => {
      const committedSet = new Set(storageOrder.map(normalizeAssetId));
      const removedAssetIds = baselineOrderRef.current.filter(
        (assetId) => !committedSet.has(normalizeAssetId(assetId)),
      );

      removedAssetIds.forEach((assetId) => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED)
            .addProperties({
              source: WatchlistAnalytics.REMOVE_SOURCE.FULLSCREEN_EDIT,
              asset_type: getWatchlistAssetType(assetId),
            })
            .build(),
        );
      });
    },
    [createEventBuilder, trackEvent],
  );

  const commitPendingChanges = useCallback(() => {
    if (draft === null) {
      return;
    }

    const changed = !ordersMatch(draft.order, baselineOrderRef.current);

    if (!changed) {
      setDraft(null);
      setIsEditMode(false);
      return;
    }

    const storageOrder = getStorageOrderFromDraft(draft, queryAssetIdSet);
    updateListMutation.mutate(storageOrder as CaipAssetType[], {
      onSuccess: () => {
        trackRemovedTokens(storageOrder);
      },
      onError: () => {
        setDraft(null);
      },
    });
    setIsEditMode(false);
  }, [draft, queryAssetIdSet, trackRemovedTokens, updateListMutation]);

  useEffect(() => {
    if (isEditMode && displayTokens.length === 0) {
      commitPendingChanges();
    }
  }, [commitPendingChanges, displayTokens.length, isEditMode]);

  const handleEditPress = useCallback(() => {
    baselineOrderRef.current = getTokenAssetIdOrder(queryTokens);
    setDraft(createDraftFromTokens(queryTokens));
    setIsEditMode(true);
  }, [queryTokens]);

  const onRemoveFromDraft = useCallback((assetId: string) => {
    setDraft((prev) => {
      if (prev === null) {
        return prev;
      }

      const nextOrder = removeFromDraftOrder(prev.order, assetId);
      return nextOrder.length === prev.order.length
        ? prev
        : { order: nextOrder };
    });
  }, []);

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      setDraft((prev) => {
        if (prev === null) {
          return prev;
        }

        return { order: reorderDraftOrder(prev.order, from, to) };
      });
    },
    [],
  );

  const handleDonePress = useCallback(() => {
    commitPendingChanges();
  }, [commitPendingChanges]);

  return {
    isEditMode,
    displayTokens,
    handleEditPress,
    handleDonePress,
    handleReorder,
    onRemoveFromDraft,
  };
};
