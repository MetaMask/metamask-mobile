import { useCallback, useRef, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine/Engine';
import {
  PointsEventDto,
  PointsEventEarnType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { selectPointsEvents } from '../../../../reducers/rewards/selectors';
import { strings } from '../../../../../locales/i18n';
import { setPointsEvents as setPointsEventsAction } from '../../../../reducers/rewards';
export interface UsePointsEventsOptions {
  seasonId: string | undefined;
  subscriptionId: string;
  type?: PointsEventEarnType;
  enabled?: boolean;
}

export interface UsePointsEventsResult {
  pointsEvents: PointsEventDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: (forceFresh?: boolean) => void;
  isRefreshing: boolean;
}

export const usePointsEvents = (
  options: UsePointsEventsOptions,
): UsePointsEventsResult => {
  const { seasonId, subscriptionId, type, enabled = true } = options;
  const dispatch = useDispatch();
  const uiStorePointsEvents = useSelector(selectPointsEvents);
  const [pointsEvents, setPointsEvents] = useState<PointsEventDto[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(
    enabled && !!seasonId && !!subscriptionId,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks the active first-page request for cancellation when dependencies change
  const activeRequestRef = useRef<{ cancelled: boolean } | null>(null);
  // Tracks the active pagination request for cancellation when a first-page request starts
  const activePaginationRequestRef = useRef<{ cancelled: boolean } | null>(
    null,
  );

  const fetchPointsEvents = useCallback(
    async ({
      isFirstPage,
      currentCursor = null,
      forceFresh = false,
    }: {
      isFirstPage: boolean;
      currentCursor?: string | null;
      forceFresh?: boolean;
    }): Promise<{ cancelled: boolean }> => {
      // For pagination, prevent concurrent requests
      if (!isFirstPage && isLoadingRef.current) {
        return { cancelled: false };
      }
      isLoadingRef.current = true;

      // Track request for cancellation
      let request: { cancelled: boolean } | null = null;
      if (isFirstPage) {
        // Cancel any in-flight first-page request
        if (activeRequestRef.current) {
          activeRequestRef.current.cancelled = true;
        }
        // Also cancel any in-flight pagination request
        if (activePaginationRequestRef.current) {
          activePaginationRequestRef.current.cancelled = true;
          // Reset isLoadingMore since we're cancelling the pagination request
          setIsLoadingMore(false);
        }
        request = { cancelled: false };
        activeRequestRef.current = request;
        setIsLoading(true);
        setError(null);
      } else {
        // Track pagination request for cancellation
        request = { cancelled: false };
        activePaginationRequestRef.current = request;
        setIsLoadingMore(true);
      }

      try {
        if (!seasonId || !subscriptionId) return { cancelled: false };
        const pointsEventsData = await Engine.controllerMessenger.call(
          'RewardsController:getPointsEvents',
          {
            seasonId,
            subscriptionId,
            cursor: currentCursor,
            forceFresh,
            type,
          },
        );

        // Discard results if this request was superseded
        if (request?.cancelled) {
          return { cancelled: true };
        }

        if (isFirstPage) {
          setPointsEvents(pointsEventsData.results);
          dispatch(setPointsEventsAction(pointsEventsData.results));
        } else {
          setPointsEvents((prev) => {
            const newPointsEvents = prev
              ? [...prev, ...pointsEventsData.results]
              : pointsEventsData.results;
            dispatch(setPointsEventsAction(newPointsEvents));
            return newPointsEvents;
          });
        }

        setCursor(pointsEventsData.cursor);
        setHasMore(pointsEventsData.has_more);
      } catch (err) {
        if (request?.cancelled) {
          return { cancelled: true };
        }
        const errorMessage =
          err instanceof Error
            ? err.message
            : strings('rewards.error_messages.unknown_error');
        setError(errorMessage);
      } finally {
        if (!request?.cancelled) {
          isLoadingRef.current = false;
          if (isFirstPage) {
            setIsLoading(false);
          } else {
            setIsLoadingMore(false);
          }
        }
      }
      return { cancelled: false };
    },
    [seasonId, subscriptionId, type, dispatch],
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && cursor) {
      fetchPointsEvents({
        isFirstPage: false,
        currentCursor: cursor,
      });
    }
  }, [isLoadingMore, hasMore, cursor, fetchPointsEvents]);

  useEffect(() => {
    if (
      !isLoading &&
      pointsEvents === null &&
      uiStorePointsEvents !== null &&
      uiStorePointsEvents?.length > 0
    ) {
      setPointsEvents(uiStorePointsEvents);
    }
  }, [
    isLoading,
    pointsEvents,
    seasonId,
    subscriptionId,
    fetchPointsEvents,
    uiStorePointsEvents,
  ]);

  const refresh = useCallback(
    async (forceFresh = true) => {
      setIsRefreshing(true);
      setCursor(null);
      setHasMore(true);
      const result = await fetchPointsEvents({
        isFirstPage: true,
        forceFresh,
      });
      // Only dismiss refresh indicator if this request wasn't cancelled
      if (!result.cancelled) {
        setIsRefreshing(false);
      }
    },
    [fetchPointsEvents],
  );

  const refreshWithoutForceFresh = useCallback(async () => {
    refresh(false);
  }, [refresh]);

  // Fetch data when enabled becomes true or when dependencies change while enabled
  useEffect(() => {
    // Only fetch if enabled and we have required params
    if (!enabled || !seasonId || !subscriptionId) {
      return;
    }

    setIsRefreshing(false);
    setCursor(null);
    setHasMore(true);
    setPointsEvents(null);
    fetchPointsEvents({ isFirstPage: true });
  }, [enabled, fetchPointsEvents, seasonId, subscriptionId]);

  // Listen for reward claimed events to trigger refetch
  useInvalidateByRewardEvents(
    ['RewardsController:accountLinked', 'RewardsController:rewardClaimed'],
    refresh,
  );

  useInvalidateByRewardEvents(
    ['RewardsController:pointsEventsUpdated'],
    // Don't force fresh when points events are updated; this event is only emitted when we've just fetched new points events
    // otherwise we'll fetch the same points events again
    refreshWithoutForceFresh,
  );

  return {
    pointsEvents,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  };
};
