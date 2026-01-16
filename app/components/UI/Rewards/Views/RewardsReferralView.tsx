import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import ReferralDetails from '../components/ReferralDetails/ReferralDetails';
import { ScrollView } from 'react-native-gesture-handler';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

const ReferralRewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const hasTrackedReferralsViewed = useRef(false);
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    if (!hasTrackedReferralsViewed.current) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_REFERRALS_VIEWED).build(),
      );
      hasTrackedReferralsViewed.current = true;
    }
  }, [trackEvent, createEventBuilder]);

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(
        strings('rewards.referral_title'),
        navigation,
        false,
        colors,
      ),
      headerTitleAlign: 'center',
    });
  }, [colors, navigation]);

  return (
    <ErrorBoundary navigation={navigation} view="ReferralRewardsView">
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 py-4')}
        showsVerticalScrollIndicator={false}
      >
        <ReferralDetails />
      </ScrollView>
    </ErrorBoundary>
  );
};

export default ReferralRewardsView;
