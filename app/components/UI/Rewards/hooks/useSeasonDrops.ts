import { useCallback, useRef, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import {
  setSeasonDrops,
  setSeasonDropsLoading,
  setSeasonDropsError,
} from '../../../../reducers/rewards';
import {
  selectSeasonId,
  selectSeasonDrops,
  selectSeasonDropsLoading,
  selectSeasonDropsError,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { useFocusEffect } from '@react-navigation/native';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectDropsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';

interface CategorizedDrops {
  active: SeasonDropDto[];
  upcoming: SeasonDropDto[];
  previous: SeasonDropDto[];
}

interface UseSeasonDropsReturn {
  /** All drops */
  drops: SeasonDropDto[] | null;
  /** Categorized drops by status */
  categorizedDrops: CategorizedDrops;
  /** Whether drops are loading */
  isLoading: boolean;
  /** Whether there was an error fetching drops */
  hasError: boolean;
  /** Fetch drops from the API */
  fetchDrops: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage drops data from the rewards API.
 * Categorizes drops into active (live), upcoming, and previous (calculating/distributing/complete).
 */
export const useSeasonDrops = (): UseSeasonDropsReturn => {
  const seasonId = useSelector(selectSeasonId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const drops = useSelector(selectSeasonDrops);
  const isLoading = useSelector(selectSeasonDropsLoading);
  const hasError = useSelector(selectSeasonDropsError);
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);
  const isDropsEnabled = useSelector(selectDropsRewardsEnabledFlag);

  const fetchDrops = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !seasonId || !isDropsEnabled) {
      dispatch(setSeasonDrops(null));
      dispatch(setSeasonDropsLoading(false));
      dispatch(setSeasonDropsError(false));
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(setSeasonDropsLoading(true));
      dispatch(setSeasonDropsError(false));

      const dropsData = await Engine.controllerMessenger.call(
        'RewardsController:getSeasonDrops',
        seasonId,
        subscriptionId,
      );

      dispatch(setSeasonDrops(dropsData));
    } catch {
      dispatch(setSeasonDropsError(true));
      console.error('Error fetching drops');
    } finally {
      isLoadingRef.current = false;
      dispatch(setSeasonDropsLoading(false));
    }
  }, [dispatch, seasonId, subscriptionId, isDropsEnabled]);

  // Categorize drops by status
  const categorizedDrops = useMemo((): CategorizedDrops => {
    if (!drops) {
      return { active: [], upcoming: [], previous: [] };
    }

    const active: SeasonDropDto[] = [];
    const upcoming: SeasonDropDto[] = [];
    const previous: SeasonDropDto[] = [];

    try {
      drops.forEach((drop) => {
        switch (drop.status) {
          case DropStatus.OPEN:
            active.push(drop);
            break;
          case DropStatus.UPCOMING:
            upcoming.push(drop);
            break;
          case DropStatus.CLOSED:
          case DropStatus.CALCULATED:
          case DropStatus.DISTRIBUTED:
            previous.push(drop);
            break;
        }
      });
    } catch {
      dispatch(setSeasonDrops(null));
    }

    // Sort upcoming by opensAt date (earliest first)
    upcoming.sort(
      (a, b) => new Date(a.opensAt).getTime() - new Date(b.opensAt).getTime(),
    );

    // Sort previous by closesAt date (most recent first)
    previous.sort(
      (a, b) => new Date(b.closesAt).getTime() - new Date(a.closesAt).getTime(),
    );

    return { active, upcoming, previous };
  }, [drops, dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchDrops();
    }, [fetchDrops]),
  );

  // Listen for reward events to trigger refetch
  useInvalidateByRewardEvents(
    ['RewardsController:accountLinked', 'RewardsController:balanceUpdated'],
    fetchDrops,
  );

  return {
    drops,
    categorizedDrops,
    isLoading,
    hasError,
    fetchDrops,
  };
};
