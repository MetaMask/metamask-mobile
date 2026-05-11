import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  HeaderStandard,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useVipViewGuard } from '../hooks/useVipViewGuard';
import VipErrorBanner from '../components/Vip/VipErrorBanner';
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

  const { canViewVip, dashboard, showSkeleton, showError, fetchVipDashboard } =
    useVipViewGuard('vip_tiers');

  if (!canViewVip) {
    return null;
  }

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
            <VipErrorBanner
              onRetry={fetchVipDashboard}
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
