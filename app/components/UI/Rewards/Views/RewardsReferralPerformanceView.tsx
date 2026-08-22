import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import ReferralRevenueShareDashboard from '../components/ReferralRevenueShareDashboard/ReferralRevenueShareDashboard';

const RewardsReferralPerformanceView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <ErrorBoundary
      navigation={navigation}
      view="RewardsReferralPerformanceView"
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderStandard
          title="Earnings"
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ReferralRevenueShareDashboard mode="performance" />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsReferralPerformanceView;
