import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  Box,
  HeaderStandard,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import { useVipDashboard } from '../hooks/useVipDashboard';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import VipTierRow from '../components/Vip/VipTierRow';

export const REWARDS_VIP_TIERS_VIEW_TEST_IDS = {
  ROOT: 'rewards-vip-tiers-view',
  LIST: 'rewards-vip-tiers-list',
  SKELETON: 'rewards-vip-tiers-skeleton',
  ERROR: 'rewards-vip-tiers-error',
} as const;

const RewardsVipTiersView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const canViewVip = Boolean(subscriptionId && isVipEnabled);

  const {
    dashboard,
    isLoading,
    hasError,
    hasAttemptedFetch,
    fetchVipDashboard,
  } = useVipDashboard();

  useTrackRewardsPageView({
    page_type: 'vip_tiers',
    enabled: canViewVip,
  });

  useEffect(() => {
    if (!canViewVip) {
      navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
    }
  }, [canViewVip, navigation]);

  if (!canViewVip) {
    return null;
  }

  const showSkeleton = (!hasAttemptedFetch || isLoading) && !dashboard;
  const showError = hasError && !dashboard;
  const tiers = dashboard?.tiers ?? [];
  const nextTierId = dashboard?.nextTier?.id;

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipTiersView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIP_TIERS_VIEW_TEST_IDS.ROOT}
      >
        <HeaderStandard
          title={strings('rewards.vip.tiers_title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
        />
        <ScrollView contentContainerStyle={tw.style('p-4 gap-2 pb-8')}>
          {showSkeleton ? (
            <Box
              twClassName="gap-2"
              testID={REWARDS_VIP_TIERS_VIEW_TEST_IDS.SKELETON}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} style={tw.style('h-12 rounded-xl')} />
              ))}
            </Box>
          ) : showError ? (
            <RewardsErrorBanner
              title={strings('rewards.vip.error_title')}
              description={strings('rewards.vip.error_description')}
              onConfirm={fetchVipDashboard}
              confirmButtonLabel={strings('rewards.vip.retry_button')}
              testID={REWARDS_VIP_TIERS_VIEW_TEST_IDS.ERROR}
            />
          ) : (
            <Box
              twClassName="gap-1"
              testID={REWARDS_VIP_TIERS_VIEW_TEST_IDS.LIST}
            >
              {tiers.map((tier) => (
                <VipTierRow
                  key={tier.id}
                  tier={tier}
                  isNext={tier.id === nextTierId}
                />
              ))}
            </Box>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsVipTiersView;
