import { useCallback, useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine/Engine';
import { PointsEventDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { selectActiveTab } from '../../../../reducers/rewards/selectors';

export interface UsePointsEventsOptions {
  seasonId: string | undefined;
  subscriptionId: string;
}

export interface UsePointsEventsResult {
  pointsEvents: PointsEventDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  isRefreshing: boolean;
}

export const usePointsEvents = (
  options: UsePointsEventsOptions,
): UsePointsEventsResult => {
  const { seasonId, subscriptionId } = options;
  const activeTab = useSelector(selectActiveTab);

  const [pointsEvents, setPointsEvents] = useState<PointsEventDto[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(!!seasonId && !!subscriptionId);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPointsEvents = useCallback(
    async ({
      isInitial,
      currentCursor = null,
      forceFresh = false,
    }: {
      isInitial: boolean;
      currentCursor?: string | null;
      forceFresh?: boolean;
    }) => {
      if (isLoadingRef.current) {
        return;
      }
      isLoadingRef.current = true;
      if (isInitial) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        if (!seasonId || !subscriptionId) return;
        const pointsEventsData = await Engine.controllerMessenger.call(
          'RewardsController:getPointsEvents',
          {
            seasonId,
            subscriptionId,
            cursor: currentCursor,
            forceFresh,
          },
        );

        if (isInitial) {
          setPointsEvents(pointsEventsData.results);
        } else {
          setPointsEvents((prev) =>
            prev
              ? [...prev, ...pointsEventsData.results]
              : pointsEventsData.results,
          );
        }

        setCursor(pointsEventsData.cursor);
        setHasMore(pointsEventsData.has_more);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);

        // If it's a pagination error, don't clear existing data, but clear on initial fetch or refresh
        if (isInitial) {
          setPointsEvents([]);
        }
      } finally {
        isLoadingRef.current = false;
        if (isInitial) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [seasonId, subscriptionId],
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && cursor) {
      fetchPointsEvents({
        isInitial: false,
        currentCursor: cursor,
      });
    }
  }, [isLoadingMore, hasMore, cursor, fetchPointsEvents]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setHasMore(true);
    await fetchPointsEvents({
      isInitial: true,
      forceFresh: true,
    });
    setIsRefreshing(false);
  }, [fetchPointsEvents]);

  // Listen for activeTab changes to refresh when switching to activity tab
  useEffect(() => {
    if (activeTab === 'activity') {
      fetchPointsEvents({ isInitial: true });
    }
  }, [activeTab, fetchPointsEvents]);

  // Listen for reward claimed events to trigger refetch
  useInvalidateByRewardEvents(
    [
      'RewardsController:accountLinked',
      'RewardsController:rewardClaimed',
      'RewardsController:pointsEventsUpdated',
    ],
    refresh,
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
