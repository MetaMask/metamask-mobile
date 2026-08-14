import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
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
          startAccessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to referrals"
              testID="performance-header-back-button"
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={tw.style('h-10 w-10 items-center justify-center')}
            >
              <Icon
                name={IconName.ArrowLeft}
                size={IconSize.Md}
                color={IconColor.IconDefault}
              />
            </Pressable>
          }
          includesTopInset
        />
        <ReferralRevenueShareDashboard mode="performance" />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsReferralPerformanceView;
