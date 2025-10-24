import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { ActivityIndicator } from 'react-native';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';
import { useParams } from '../../../../../util/navigation/navUtils';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardScreens } from '../../util/metrics';

const ValidatingKYC = () => {
  const navigation = useNavigation();
  const hasNavigatedToWebview = useRef(false);
  const { trackEvent, createEventBuilder } = useMetrics();

  const { verificationState } = useUserRegistrationStatus();
  const { sessionUrl } = useParams<{ sessionUrl: string }>();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.VALIDATING_KYC,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    if (verificationState === 'VERIFIED') {
      navigation.navigate(Routes.CARD.ONBOARDING.PERSONAL_DETAILS);
    } else if (verificationState === 'REJECTED') {
      navigation.navigate(Routes.CARD.ONBOARDING.KYC_FAILED);
    } else if (
      verificationState === 'UNVERIFIED' &&
      sessionUrl &&
      !hasNavigatedToWebview.current
    ) {
      hasNavigatedToWebview.current = true;
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: sessionUrl,
          title: 'Identity Verification',
        },
      });
    }
  }, [verificationState, navigation, sessionUrl]);

  const renderFormFields = () => <ActivityIndicator />;

  const renderActions = () => null;

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.validating_kyc.title')}
      description={''}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ValidatingKYC;
