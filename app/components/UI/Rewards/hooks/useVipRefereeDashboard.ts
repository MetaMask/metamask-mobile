import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { VipRefereeMeState } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  setVipRefereeDashboard,
  setVipRefereeDashboardError,
  setVipRefereeDashboardLoading,
} from '../../../../reducers/rewards';
import {
  selectIsVipReferee,
  selectVipRefereeDashboard,
  selectVipRefereeDashboardError,
  selectVipRefereeDashboardLoading,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

export interface UseVipRefereeDashboardResult {
  dashboard: VipRefereeMeState | null;
  isLoading: boolean;
  hasError: boolean;
  hasAttemptedFetch: boolean;
  fetchVipRefereeDashboard: () => Promise<void>;
}

export const useVipRefereeDashboard = (): UseVipRefereeDashboardResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipReferee = useSelector(selectIsVipReferee);
  const dashboard = useSelector(selectVipRefereeDashboard(subscriptionId));
  const isLoading = useSelector(selectVipRefereeDashboardLoading);
  const hasError = useSelector(selectVipRefereeDashboardError);
  const isLoadingRef = useRef(false);
  // Tracks whether at least one fetch (success, null, or error) has resolved so
  // consumers can distinguish "pre-fetch idle" from "fetch finished with no
  // data" and avoid a blank-screen flash on first mount.
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  const fetchVipRefereeDashboard = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !isVipReferee) {
      if (subscriptionId) {
        dispatch(setVipRefereeDashboard({ subscriptionId, dashboard: null }));
      }
      dispatch(setVipRefereeDashboardError(false));
      dispatch(setVipRefereeDashboardLoading(false));
      setHasAttemptedFetch(true);
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(setVipRefereeDashboardLoading(true));
      dispatch(setVipRefereeDashboardError(false));

      const refereeDashboard = await Engine.controllerMessenger.call(
        'RewardsController:getVipRefereeDashboard',
        subscriptionId,
      );

      dispatch(
        setVipRefereeDashboard({
          subscriptionId,
          dashboard: refereeDashboard,
        }),
      );
    } catch {
      dispatch(setVipRefereeDashboardError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setVipRefereeDashboardLoading(false));
      setHasAttemptedFetch(true);
    }
  }, [dispatch, isVipReferee, subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      fetchVipRefereeDashboard().then();
    }, [fetchVipRefereeDashboard]),
  );

  return {
    dashboard,
    isLoading,
    hasError,
    hasAttemptedFetch,
    fetchVipRefereeDashboard,
  };
};
