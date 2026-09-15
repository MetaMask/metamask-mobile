import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, View } from 'react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import ReferralRevenueShareDashboard from '../components/ReferralRevenueShareDashboard/ReferralRevenueShareDashboard';

const ReferralRewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const [isQrCodeVisible, setIsQrCodeVisible] = useState(false);
  return (
    <ErrorBoundary navigation={navigation} view="ReferralRewardsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderStandard
          title={strings('rewards.referral_title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
          endAccessory={
            <View style={tw.style('flex-row gap-1')}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Earnings"
                testID="referral-performance-button"
                onPress={() =>
                  navigation.navigate(Routes.REFERRAL_REWARDS_PERFORMANCE_VIEW)
                }
                hitSlop={10}
                style={tw.style('h-10 w-10 items-center justify-center')}
              >
                <Icon
                  name={IconName.Chart}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show referral QR code"
                testID="referral-qr-code-button"
                onPress={() => setIsQrCodeVisible(true)}
                hitSlop={10}
                style={tw.style('h-10 w-10 items-center justify-center')}
              >
                <Icon
                  name={IconName.QrCode}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                />
              </Pressable>
            </View>
          }
        />
        <ReferralRevenueShareDashboard
          isQrCodeVisible={isQrCodeVisible}
          onQrCodeClose={() => setIsQrCodeVisible(false)}
          onEarningsPress={() =>
            navigation.navigate(Routes.REFERRAL_REWARDS_PERFORMANCE_VIEW)
          }
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ReferralRewardsView;
