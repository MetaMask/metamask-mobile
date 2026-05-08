import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { VipDashboardState } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  setVipDashboard,
  setVipDashboardError,
  setVipDashboardLoading,
} from '../../../../reducers/rewards';
import {
  selectVipDashboard,
  selectVipDashboardError,
  selectVipDashboardLoading,
} from '../../../../reducers/rewards/selectors';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';

export interface UseVipDashboardResult {
  dashboard: VipDashboardState | null;
  isLoading: boolean;
  hasError: boolean;
  fetchVipDashboard: () => Promise<void>;
}

export const useVipDashboard = (): UseVipDashboardResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const dashboard = useSelector(selectVipDashboard(subscriptionId));
  const isLoading = useSelector(selectVipDashboardLoading);
  const hasError = useSelector(selectVipDashboardError);
  const isLoadingRef = useRef(false);

  const fetchVipDashboard = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !isVipEnabled) {
      if (subscriptionId) {
        dispatch(setVipDashboard({ subscriptionId, dashboard: null }));
      }
      dispatch(setVipDashboardError(false));
      dispatch(setVipDashboardLoading(false));
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(setVipDashboardLoading(true));
      dispatch(setVipDashboardError(false));

      const vipDashboard = await Engine.controllerMessenger.call(
        'RewardsController:getVIPDashboard',
        subscriptionId,
      );

      dispatch(setVipDashboard({ subscriptionId, dashboard: vipDashboard }));
    } catch {
      dispatch(setVipDashboardError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setVipDashboardLoading(false));
    }
  }, [dispatch, isVipEnabled, subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      fetchVipDashboard().then();
    }, [fetchVipDashboard]),
  );

  return {
    dashboard,
    isLoading,
    hasError,
    fetchVipDashboard,
  };
};
