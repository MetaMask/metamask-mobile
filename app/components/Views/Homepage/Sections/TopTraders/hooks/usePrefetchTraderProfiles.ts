import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import ReactQueryService from '../../../../../../core/ReactQueryService';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import { prefetchTraderProfileData } from '../../../../../../util/social/traderProfileQueries';

const PREFETCH_INTERVAL_MS = 30_000;
const VISIBILITY_DEBOUNCE_MS = 300;

export interface UsePrefetchTraderProfilesOptions {
  enabled: boolean;
  isSectionVisible: boolean;
}

export const usePrefetchTraderProfiles = (
  visibleTraderIds: string[],
  options: UsePrefetchTraderProfilesOptions,
) => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const previouslyVisibleRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTaskRef = useRef<{ cancel: () => void } | null>(null);
  const visibleTraderIdsRef = useRef(visibleTraderIds);
  visibleTraderIdsRef.current = visibleTraderIds;

  const shouldPrefetch =
    options.enabled && options.isSectionVisible && isUnlocked;
  const shouldPrefetchRef = useRef(shouldPrefetch);
  shouldPrefetchRef.current = shouldPrefetch;

  const cancelPendingPrefetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    interactionTaskRef.current?.cancel();
    interactionTaskRef.current = null;
  }, []);

  const runPrefetch = useCallback((traderIds: string[]) => {
    if (traderIds.length === 0) {
      return;
    }

    interactionTaskRef.current?.cancel();
    interactionTaskRef.current = InteractionManager.runAfterInteractions(() => {
      interactionTaskRef.current = null;

      if (!shouldPrefetchRef.current) {
        return;
      }

      Promise.allSettled(
        traderIds.map((id) =>
          prefetchTraderProfileData(ReactQueryService.queryClient, id),
        ),
      ).catch(() => undefined);
    });
  }, []);

  const prefetchVisible = useCallback(() => {
    runPrefetch(visibleTraderIdsRef.current);
  }, [runPrefetch]);

  const prefetchNewlyVisible = useCallback(
    (ids: string[]) => {
      const previous = new Set(previouslyVisibleRef.current);
      const newlyVisible = ids.filter((id) => !previous.has(id));
      previouslyVisibleRef.current = ids;

      if (newlyVisible.length === 0) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        runPrefetch(newlyVisible);
        debounceTimerRef.current = null;
      }, VISIBILITY_DEBOUNCE_MS);
    },
    [runPrefetch],
  );

  useEffect(() => {
    if (!shouldPrefetch) {
      cancelPendingPrefetch();
      previouslyVisibleRef.current = [];
      return;
    }

    prefetchNewlyVisible(visibleTraderIds);
  }, [
    visibleTraderIds,
    shouldPrefetch,
    prefetchNewlyVisible,
    cancelPendingPrefetch,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!shouldPrefetch) {
        return undefined;
      }

      prefetchVisible();

      const intervalId = setInterval(() => {
        prefetchVisible();
      }, PREFETCH_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
        cancelPendingPrefetch();
        previouslyVisibleRef.current = [];
      };
    }, [shouldPrefetch, prefetchVisible, cancelPendingPrefetch]),
  );
};

export default usePrefetchTraderProfiles;
