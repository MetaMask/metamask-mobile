import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InteractionManager, Platform, ScrollView, Share } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import ReferralDetails from '../components/ReferralDetails/ReferralDetails';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  selectReferralCode,
  selectReferralDetailsLoading,
} from '../../../../reducers/rewards/selectors';
import { buildReferralUrl, RewardsMetricsButtons } from '../utils';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import Logger from '../../../../util/Logger';

const ReferralRewardsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const hasTrackedReferralsViewed = useRef(false);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const referralCode = useSelector(selectReferralCode);
  const referralDetailsLoading = useSelector(selectReferralDetailsLoading);

  useTrackRewardsPageView({ page_type: 'referrals' });

  useEffect(() => {
    if (!hasTrackedReferralsViewed.current) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_REFERRALS_VIEWED).build(),
      );
      hasTrackedReferralsViewed.current = true;
    }
  }, [trackEvent, createEventBuilder]);

  const handleShareLink = () => {
    if (!referralCode) return;
    const link = buildReferralUrl(referralCode);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: RewardsMetricsButtons.SHARE_REFERRAL_LINK,
        })
        .build(),
    );
    // Use RN's built-in Share API instead of react-native-share. On Android,
    // react-native-share uses startActivityForResult, which notifies every
    // ActivityEventListener (including ReactNativePayments) and can crash when
    // the sheet is dismissed with a null intent.
    InteractionManager.runAfterInteractions(() => {
      const subject = strings(
        'rewards.referral.actions.share_referral_subject',
      );
      const shareContent =
        Platform.OS === 'ios'
          ? { message: subject, url: link }
          : { message: `${subject}\n${link}` };

      Share.share(shareContent).catch((error) => {
        Logger.log('Error while trying to share referral link', error);
      });
    });
  };

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
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow p-4')}
          showsVerticalScrollIndicator={false}
        >
          <ReferralDetails />
        </ScrollView>

        <Box twClassName="p-4 mb-2">
          <Button
            variant={ButtonVariant.Primary}
            isFullWidth
            size={ButtonSize.Lg}
            onPress={handleShareLink}
            disabled={!referralCode || referralDetailsLoading}
            testID="referral-share-button"
          >
            {strings('rewards.referral.actions.share_referral_link')}
          </Button>
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ReferralRewardsView;
