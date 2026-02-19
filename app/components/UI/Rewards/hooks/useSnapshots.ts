import { useCallback, useRef, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import {
  setSnapshots,
  setSnapshotsLoading,
  setSnapshotsError,
} from '../../../../reducers/rewards';
import {
  selectSeasonId,
  selectSnapshots,
  selectSnapshotsLoading,
  selectSnapshotsError,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { useFocusEffect } from '@react-navigation/native';
import type { SnapshotDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { getSnapshotStatus } from '../components/SnapshotTile/SnapshotTile.utils';
import { selectSnapshotsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';

interface CategorizedSnapshots {
  active: SnapshotDto[];
  upcoming: SnapshotDto[];
  previous: SnapshotDto[];
}

interface UseSnapshotsReturn {
  /** All snapshots */
  snapshots: SnapshotDto[] | null;
  /** Categorized snapshots by status */
  categorizedSnapshots: CategorizedSnapshots;
  /** Whether snapshots are loading */
  isLoading: boolean;
  /** Whether there was an error fetching snapshots */
  hasError: boolean;
  /** Fetch snapshots from the API */
  fetchSnapshots: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage snapshots data from the rewards API.
 * Categorizes snapshots into active (live), upcoming, and previous (calculating/distributing/complete).
 */
export const useSnapshots = (): UseSnapshotsReturn => {
  const seasonId = useSelector(selectSeasonId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const snapshots = useSelector(selectSnapshots);
  const isLoading = useSelector(selectSnapshotsLoading);
  const hasError = useSelector(selectSnapshotsError);
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);
  const isSnapshotsEnabled = useSelector(selectSnapshotsRewardsEnabledFlag);

  const fetchSnapshots = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !seasonId || !isSnapshotsEnabled) {
      dispatch(setSnapshots(null));
      dispatch(setSnapshotsLoading(false));
      dispatch(setSnapshotsError(false));
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(setSnapshotsLoading(true));
      dispatch(setSnapshotsError(false));

      const snapshotsData = await Engine.controllerMessenger.call(
        'RewardsController:getSnapshots',
        seasonId,
        subscriptionId,
      );

      dispatch(setSnapshots(snapshotsData));
    } catch {
      dispatch(setSnapshotsError(true));
      console.error('Error fetching snapshots');
    } finally {
      isLoadingRef.current = false;
      dispatch(setSnapshotsLoading(false));
    }
  }, [dispatch, seasonId, subscriptionId, isSnapshotsEnabled]);

  // Categorize snapshots by status
  const categorizedSnapshots = useMemo((): CategorizedSnapshots => {
    if (!snapshots) {
      return { active: [], upcoming: [], previous: [] };
    }

    const active: SnapshotDto[] = [];
    const upcoming: SnapshotDto[] = [];
    const previous: SnapshotDto[] = [];

    snapshots.forEach((snapshot) => {
      const status = getSnapshotStatus(snapshot);
      switch (status) {
        case 'live':
          active.push(snapshot);
          break;
        case 'upcoming':
          upcoming.push(snapshot);
          break;
        case 'calculating':
        case 'distributing':
        case 'complete':
          previous.push(snapshot);
          break;
      }
    });

    // Sort upcoming by opensAt date (earliest first)
    upcoming.sort(
      (a, b) => new Date(a.opensAt).getTime() - new Date(b.opensAt).getTime(),
    );

    // Sort previous by closesAt date (most recent first)
    previous.sort(
      (a, b) => new Date(b.closesAt).getTime() - new Date(a.closesAt).getTime(),
    );

    return { active, upcoming, previous };
  }, [snapshots]);

  useFocusEffect(
    useCallback(() => {
      fetchSnapshots();
    }, [fetchSnapshots]),
  );

  // Listen for reward events to trigger refetch
  useInvalidateByRewardEvents(
    ['RewardsController:accountLinked', 'RewardsController:balanceUpdated'],
    fetchSnapshots,
  );

  return {
    snapshots,
    categorizedSnapshots,
    isLoading,
    hasError,
    fetchSnapshots,
  };
};
