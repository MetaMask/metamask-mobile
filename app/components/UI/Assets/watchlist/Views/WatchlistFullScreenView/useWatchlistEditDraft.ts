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
  autoCommitWhenEmpty?: boolean;
  reverseStorageOrder?: boolean;
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
  handleDonePress: () => Promise<boolean>;
  handleReorder: (event: ReorderableListReorderEvent) => void;
  onRemoveFromDraft: (assetId: string) => void;
}

export const useWatchlistEditDraft = ({
  queryTokens,
  autoCommitWhenEmpty = true,
  reverseStorageOrder = true,
  updateListMutation,
}: UseWatchlistEditDraftParams): UseWatchlistEditDraftResult => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [draft, setDraft] = useState<WatchlistEditDraft | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const baselineOrderRef = useRef<string[]>([]);
  /** Normalized asset id -> original (un-lowercased) CAIP asset id, for analytics. */
  const originalAssetIdByNormalizedIdRef = useRef<Map<string, string>>(
    new Map(),
  );

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
        const originalAssetId =
          originalAssetIdByNormalizedIdRef.current.get(
            normalizeAssetId(assetId),
          ) ?? assetId;

        trackEvent(
          createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED)
            .addProperties({
              source: WatchlistAnalytics.REMOVE_SOURCE.FULLSCREEN_EDIT,
              asset_id: originalAssetId,
              asset_type: getWatchlistAssetType(originalAssetId),
            })
            .build(),
        );
      });
    },
    [createEventBuilder, trackEvent],
  );

  const commitPendingChanges = useCallback(async (): Promise<boolean> => {
    if (draft === null) {
      return true;
    }

    const changed = !ordersMatch(draft.order, baselineOrderRef.current);

    if (!changed) {
      setDraft(null);
      setIsEditMode(false);
      return true;
    }

    const storageOrder = getStorageOrderFromDraft(
      draft,
      queryAssetIdSet,
      reverseStorageOrder,
    );

    if (
      storageOrder.length === 0 &&
      baselineOrderRef.current.length > 0 &&
      draft.order.length > 0
    ) {
      return false;
    }

    setIsEditMode(false);
    return new Promise((resolve) => {
      updateListMutation.mutate(storageOrder as CaipAssetType[], {
        onSuccess: () => {
          trackRemovedTokens(storageOrder);
          resolve(true);
        },
        onError: () => {
          setDraft(null);
          resolve(false);
        },
      });
    });
  }, [
    draft,
    queryAssetIdSet,
    reverseStorageOrder,
    trackRemovedTokens,
    updateListMutation,
  ]);

  useEffect(() => {
    if (autoCommitWhenEmpty && isEditMode && displayTokens.length === 0) {
      commitPendingChanges().catch(() => undefined);
    }
  }, [
    autoCommitWhenEmpty,
    commitPendingChanges,
    displayTokens.length,
    isEditMode,
  ]);

  const handleEditPress = useCallback(() => {
    baselineOrderRef.current = getTokenAssetIdOrder(queryTokens);
    originalAssetIdByNormalizedIdRef.current = new Map(
      queryTokens.map((token) => {
        const assetId = String(token.assetId);
        return [normalizeAssetId(assetId), assetId];
      }),
    );
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

  const handleDonePress = useCallback(
    () => commitPendingChanges(),
    [commitPendingChanges],
  );

  return {
    isEditMode,
    displayTokens,
    handleEditPress,
    handleDonePress,
    handleReorder,
    onRemoveFromDraft,
  };
};
