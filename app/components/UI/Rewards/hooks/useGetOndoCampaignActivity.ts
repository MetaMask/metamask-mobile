import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignActivityById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignActivity } from '../../../../reducers/rewards';
import type { OndoGmActivityEntryDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetOndoCampaignActivityResult {
  activityEntries: OndoGmActivityEntryDto[] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  isRefreshing: boolean;
}

/**
 * Hook to fetch paginated Ondo GM campaign activity.
 * First page is cached for 1 minute by the controller.
 */
export const useGetOndoCampaignActivity = (
  campaignId: string | undefined,
): UseGetOndoCampaignActivityResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const cachedActivity = useSelector(
    selectOndoCampaignActivityById(subscriptionId ?? undefined, campaignId),
  );

  const [activityEntries, setActivityEntries] = useState<
    OndoGmActivityEntryDto[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const activeRequestRef = useRef<{ cancelled: boolean } | null>(null);
  const activePaginationRef = useRef<{ cancelled: boolean } | null>(null);

  const fetchActivity = useCallback(
    async ({
      isFirstPage,
      currentCursor = null,
    }: {
      isFirstPage: boolean;
      currentCursor?: string | null;
    }): Promise<{ cancelled: boolean }> => {
      if (!isFirstPage && isLoadingRef.current) {
        return { cancelled: false };
      }
      isLoadingRef.current = true;

      let request: { cancelled: boolean } | null = null;
      if (isFirstPage) {
        if (activeRequestRef.current) {
          activeRequestRef.current.cancelled = true;
        }
        if (activePaginationRef.current) {
          activePaginationRef.current.cancelled = true;
          setIsLoadingMore(false);
        }
        request = { cancelled: false };
        activeRequestRef.current = request;
        setIsLoading(true);
        setError(null);
      } else {
        request = { cancelled: false };
        activePaginationRef.current = request;
        setIsLoadingMore(true);
      }

      try {
        if (!subscriptionId || !campaignId || !isOptedIn) {
          return { cancelled: false };
        }

        const data = await Engine.controllerMessenger.call(
          'RewardsController:getOndoCampaignActivity',
          { campaignId, subscriptionId, cursor: currentCursor },
        );

        if (request?.cancelled) {
          return { cancelled: true };
        }

        if (isFirstPage) {
          setActivityEntries(data.results);
          dispatch(
            setOndoCampaignActivity({
              subscriptionId,
              campaignId,
              entries: data.results,
            }),
          );
        } else {
          setActivityEntries((prev) => {
            const merged = prev ? [...prev, ...data.results] : data.results;
            dispatch(
              setOndoCampaignActivity({
                subscriptionId,
                campaignId,
                entries: merged,
              }),
            );
            return merged;
          });
        }

        setCursor(data.cursor);
        setHasMore(data.has_more);
      } catch (err) {
        if (request?.cancelled) {
          return { cancelled: true };
        }
        setError(
          err instanceof Error ? err.message : 'Failed to fetch activity',
        );
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
    [subscriptionId, campaignId, isOptedIn, dispatch],
  );

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && cursor) {
      fetchActivity({ isFirstPage: false, currentCursor: cursor });
    }
  }, [isLoadingMore, hasMore, cursor, fetchActivity]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setHasMore(true);
    const result = await fetchActivity({ isFirstPage: true });
    if (!result.cancelled) {
      setIsRefreshing(false);
    }
  }, [fetchActivity]);

  // Hydrate from Redux cache when local state is empty
  useEffect(() => {
    if (!isLoading && activityEntries === null && cachedActivity) {
      setActivityEntries(cachedActivity);
    }
  }, [isLoading, activityEntries, cachedActivity]);

  // Initial fetch
  useEffect(() => {
    if (!campaignId || !subscriptionId || !isOptedIn) {
      return;
    }
    setActivityEntries(null);
    setCursor(null);
    setHasMore(true);
    fetchActivity({ isFirstPage: true });
  }, [campaignId, subscriptionId, isOptedIn, fetchActivity]);

  return {
    activityEntries,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    isRefreshing,
  };
};

export default useGetOndoCampaignActivity;
