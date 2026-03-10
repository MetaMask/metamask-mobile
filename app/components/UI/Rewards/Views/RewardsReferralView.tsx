import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import ReferralDetails from '../components/ReferralDetails/ReferralDetails';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';

export const REWARDS_REFERRAL_SAFE_AREA_TEST_ID = 'rewards-referral-safe-area';

const ReferralRewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
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

  return (
    <ErrorBoundary navigation={navigation} view="ReferralRewardsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_REFERRAL_SAFE_AREA_TEST_ID}
      >
        <HeaderCompactStandard
          title={strings('rewards.referral_title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 py-4')}
          showsVerticalScrollIndicator={false}
        >
          <ReferralDetails />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ReferralRewardsView;
