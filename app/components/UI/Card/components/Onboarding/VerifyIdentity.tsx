import React from 'react';
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

const VerifyIdentity = () => {
  const navigation = useNavigation();

  const {
    data: verificationResponse,
    isError: startVerificationIsError,
    error: startVeriricationErr,
  } = useStartVerification();

  const { sessionUrl } = verificationResponse || {};

  const handleContinue = () => {
    if (!sessionUrl) {
      return;
    }

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: sessionUrl,
        title: 'Identity Verification',
      },
    });

    navigation.navigate(Routes.CARD.ONBOARDING.VALIDATING_KYC);
  };

  const renderFormFields = () => (
    <>
      {startVerificationIsError ? (
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
          {startVeriricationErr}
        </Text>
      ) : !sessionUrl ? (
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
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
      label={strings('card.card_onboarding.confirm_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={!sessionUrl}
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
