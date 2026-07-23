import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CaipAssetType } from '@metamask/utils';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { ReorderableListReorderEvent } from 'react-native-reorderable-list';
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
      options?: { onError?: () => void; onSettled?: () => void },
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
      onError: () => {
        setDraft(null);
      },
    });
    setIsEditMode(false);
  }, [draft, queryAssetIdSet, updateListMutation]);

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
