import { useEffect } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import useTrackRewardsPageView from './useTrackRewardsPageView';
import { type UseVipDashboardResult, useVipDashboard } from './useVipDashboard';

type VipPageType = 'vip' | 'vip_tiers';

export interface UseVipViewGuardResult extends UseVipDashboardResult {
  canViewVip: boolean;
  showSkeleton: boolean;
  showError: boolean;
}

export const useVipViewGuard = (
  pageType: VipPageType,
): UseVipViewGuardResult => {
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const canViewVip = Boolean(subscriptionId && isVipEnabled);

  const vipDashboard = useVipDashboard();
  const { dashboard, isLoading, hasError, hasAttemptedFetch } = vipDashboard;

  useTrackRewardsPageView({
    page_type: pageType,
    enabled: canViewVip,
  });

  useEffect(() => {
    if (!canViewVip) {
      navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
    }
  }, [canViewVip, navigation]);

  return {
    ...vipDashboard,
    canViewVip,
    showSkeleton: (!hasAttemptedFetch || isLoading) && !dashboard,
    showError: hasError && !dashboard,
  };
};
