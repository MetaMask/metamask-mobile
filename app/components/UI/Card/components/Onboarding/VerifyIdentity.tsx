import React, { useEffect } from 'react';
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
import { useCardSDK } from '../../sdk';

const VerifyIdentity = () => {
  const navigation = useNavigation();
  const { user } = useCardSDK();

  const {
    data: verificationResponse,
    isLoading: startVerificationIsLoading,
    isError: startVerificationIsError,
    error: startVeriricationErr,
  } = useStartVerification();

  const { sessionUrl } = verificationResponse || {};

  const handleContinue = () => {
    if (!sessionUrl) {
      return;
    }

    navigation.navigate(Routes.CARD.ONBOARDING.VALIDATING_KYC, {
      sessionUrl,
    });
  };

  useEffect(() => {
    if (user?.verificationState === 'PENDING') {
      navigation.navigate(Routes.CARD.ONBOARDING.VALIDATING_KYC);
    }
  }, [navigation, user?.verificationState]);

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
