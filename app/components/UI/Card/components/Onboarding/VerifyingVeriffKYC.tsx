import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardScreens } from '../../util/metrics';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import OnboardingStep from './OnboardingStep';
import AnimatedSpinner from '../../../AnimatedSpinner';

// Timeout duration before redirecting to KYC Pending screen (in milliseconds)
const POLLING_TIMEOUT_MS = 30000;

/**
 * Screen shown after Veriff KYC WebView completes.
 * Polls the registration status to check if the user was approved or rejected.
 * - VERIFIED: Navigate to PERSONAL_DETAILS to continue onboarding
 * - REJECTED: Navigate to KYC_FAILED
 * - PENDING: After 30 seconds of polling, navigate to KYC_PENDING
 */
const VerifyingVeriffKYC = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { verificationState, startPolling, stopPolling } =
    useUserRegistrationStatus();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.VERIFYING_VERIFF_KYC,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    startPolling();

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
      });
    }, POLLING_TIMEOUT_MS);

    return () => {
      stopPolling();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [startPolling, stopPolling, navigation]);

  useEffect(() => {
    if (verificationState === 'VERIFIED') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.PERSONAL_DETAILS }],
      });
    } else if (verificationState === 'REJECTED') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
      });
    }

    // PENDING state continues polling until timeout
  }, [verificationState, navigation]);

  const renderFormFields = () => (
    <Box twClassName="flex flex-1 items-center justify-center">
      <AnimatedSpinner testID="verifying-veriff-kyc-spinner" />
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-text-alternative mt-4 px-4"
      >
        {strings('card.card_onboarding.verifying_veriff_kyc.helper_text')}
      </Text>
    </Box>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.verifying_veriff_kyc.title')}
      description={strings(
        'card.card_onboarding.verifying_veriff_kyc.description',
      )}
      formFields={renderFormFields()}
      actions={null}
    />
  );
};

export default VerifyingVeriffKYC;
