import React, { useEffect } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
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
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

const RewardsVipView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const canViewVip = Boolean(subscriptionId && isVipEnabled);

  useVipDashboard();

  useTrackRewardsPageView({
    page_type: 'vip',
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

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.VIP_VIEW}
      >
        <HeaderStandard
          title={strings('rewards.vip.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsVipView;
