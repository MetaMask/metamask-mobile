import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import useStartVerification from '../../hooks/useStartVerification';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';

const VerifyIdentity = () => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const {
    data: verificationResponse,
    isLoading: startVerificationIsLoading,
    isError: startVerificationIsError,
    error: startVeriricationErr,
  } = useStartVerification();

  const { sessionUrl } = verificationResponse || {};

  const handleContinue = useCallback(async () => {
    if (sessionUrl) {
      navigation.navigate(Routes.CARD.ONBOARDING.WEBVIEW, {
        url: sessionUrl,
      });
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VERIFY_IDENTITY_BUTTON,
        })
        .build(),
    );
  }, [navigation, sessionUrl, trackEvent, createEventBuilder]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.VERIFY_IDENTITY,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const renderFormFields = () => (
    <>
      {startVerificationIsError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="verify-identity-start-verification-error"
          twClassName="text-error-default text-center"
        >
          {startVeriricationErr}
        </Text>
      ) : !sessionUrl && !startVerificationIsLoading ? (
        <Text
          variant={TextVariant.BodySm}
          testID="verify-identity-start-verification-error"
          twClassName="text-error-default text-center"
        >
          {strings(
            'card.card_onboarding.verify_identity.start_verification_error',
          )}
        </Text>
      ) : (
        <></>
      )}
    </>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.continue_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={!sessionUrl}
      testID="verify-identity-continue-button"
    />
  );
  return (
    <OnboardingStep
      title={strings('card.card_onboarding.verify_identity.title')}
      description={strings('card.card_onboarding.verify_identity.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default VerifyIdentity;
