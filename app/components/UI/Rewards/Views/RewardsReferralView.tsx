import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import ReferralDetails from '../components/ReferralDetails/ReferralDetails';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';

const ReferralRewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const hasTrackedReferralsViewed = useRef(false);
  const { trackEvent, createEventBuilder } = useAnalytics();

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
      >
        <HeaderCompactStandard
          title={strings('rewards.referral_title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow p-4')}
          showsVerticalScrollIndicator={false}
        >
          <ReferralDetails />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ReferralRewardsView;
