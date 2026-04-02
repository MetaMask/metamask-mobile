import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignActivityById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignActivity } from '../../../../reducers/rewards';
import type {
  OndoGmActivityEntryDto,
  ActivityEntryType,
} from '../../../../core/Engine/controllers/rewards-controller/types';

// ── Mock data for visual testing ────────────────────────────────────────
// Set to `true` to bypass the real API and return hardcoded entries.
const USE_MOCK_DATA = true;

const MOCK_ACTIVITY_ENTRIES: OndoGmActivityEntryDto[] = [
  {
    type: 'DEPOSIT' as ActivityEntryType,
    srcToken: 'eip155:59144/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    destToken: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    destAddress: null,
    usdAmount: '5000.000000',
    timestamp: '2026-03-28T14:30:00.000Z',
  },
  {
    type: 'REBALANCE' as ActivityEntryType,
    srcToken: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    destToken: 'eip155:59144/erc20:0xa219439258ca9da29e9cc4ce5596924745e12b93',
    destAddress: null,
    usdAmount: null,
    timestamp: '2026-03-27T10:15:00.000Z',
  },
  {
    type: 'WITHDRAW' as ActivityEntryType,
    srcToken: 'eip155:59144/erc20:0xa219439258ca9da29e9cc4ce5596924745e12b93',
    destToken: null,
    destAddress: null,
    usdAmount: '-1250.500000',
    timestamp: '2026-03-26T08:45:00.000Z',
  },
  {
    type: 'EXTERNAL_OUTFLOW' as ActivityEntryType,
    srcToken: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    destToken: null,
    destAddress: '0x1234567890abcdef1234567890abcdef12345678',
    usdAmount: '-750.000000',
    timestamp: '2026-03-25T16:20:00.000Z',
  },
  {
    type: 'DEPOSIT' as ActivityEntryType,
    srcToken: 'eip155:59144/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    destToken: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    destAddress: null,
    usdAmount: '10000.000000',
    timestamp: '2026-03-24T12:00:00.000Z',
  },
  {
    type: 'REBALANCE' as ActivityEntryType,
    srcToken: 'eip155:59144/erc20:0xa219439258ca9da29e9cc4ce5596924745e12b93',
    destToken: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    destAddress: null,
    usdAmount: null,
    timestamp: '2026-03-23T09:30:00.000Z',
  },
];
// ─────────────────────────────────────────────────────────────────────────

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

const noop = () => undefined;

/**
 * Hook to fetch paginated Ondo GM campaign activity.
 * First page is cached for 1 minute by the controller.
 *
 * When `USE_MOCK_DATA` is `true` the hook returns hardcoded entries
 * without hitting the network -- useful for visual / Storybook testing.
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
  >(USE_MOCK_DATA ? MOCK_ACTIVITY_ENTRIES : null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(!USE_MOCK_DATA);
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
      if (USE_MOCK_DATA) return { cancelled: false };

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
    if (USE_MOCK_DATA) return;
    if (!isLoadingMore && hasMore && cursor) {
      fetchActivity({ isFirstPage: false, currentCursor: cursor });
    }
  }, [isLoadingMore, hasMore, cursor, fetchActivity]);

  const refresh = useCallback(async () => {
    if (USE_MOCK_DATA) return;
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
    if (USE_MOCK_DATA) return;
    if (!isLoading && activityEntries === null && cachedActivity) {
      setActivityEntries(cachedActivity);
    }
  }, [isLoading, activityEntries, cachedActivity]);

  // Initial fetch
  useEffect(() => {
    if (USE_MOCK_DATA) return;
    if (!campaignId || !subscriptionId || !isOptedIn) {
      return;
    }
    setActivityEntries(null);
    setCursor(null);
    setHasMore(true);
    fetchActivity({ isFirstPage: true });
  }, [campaignId, subscriptionId, isOptedIn, fetchActivity]);

  if (USE_MOCK_DATA) {
    return {
      activityEntries: MOCK_ACTIVITY_ENTRIES,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      loadMore: noop,
      refresh: noop,
      isRefreshing: false,
    };
  }

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
