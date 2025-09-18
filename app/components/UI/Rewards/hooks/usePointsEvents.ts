import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine/Engine';
import { PointsEventDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UsePointsEventsOptions {
  seasonId: string | undefined;
  subscriptionId: string;
}

export interface UsePointsEventsResult {
  pointsEvents: PointsEventDto[];
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

  const [pointsEvents, setPointsEvents] = useState<PointsEventDto[]>([]);
  const [isLoading, setIsLoading] = useState(!!seasonId && !!subscriptionId);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPointsEvents = useCallback(
    async (
      isInitial: boolean,
      currentCursor: string | null = null,
    ): Promise<void> => {
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
          },
        );

        if (isInitial) {
          setPointsEvents(pointsEventsData.results);
        } else {
          setPointsEvents((prev) => [...prev, ...pointsEventsData.results]);
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
      fetchPointsEvents(false, cursor);
    }
  }, [isLoadingMore, hasMore, cursor, fetchPointsEvents]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setHasMore(true);
    await fetchPointsEvents(true);
    setIsRefreshing(false);
  }, [fetchPointsEvents]);

  // Initial data fetch
  useEffect(() => {
    if (seasonId && subscriptionId) {
      fetchPointsEvents(true);
    }
  }, [seasonId, subscriptionId, fetchPointsEvents]);

  // Listen for account linked events to trigger refetch
  useEffect(() => {
    Engine.controllerMessenger.subscribe(
      'RewardsController:accountLinked',
      refresh,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:accountLinked',
        refresh,
      );
    };
  }, [seasonId, subscriptionId, refresh]);

  // Listen for reward claimed events to trigger refetch
  useEffect(() => {
    Engine.controllerMessenger.subscribe(
      'RewardsController:rewardClaimed',
      refresh,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:rewardClaimed',
        refresh,
      );
    };
  }, [refresh]);

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
