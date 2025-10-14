import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useParams } from '../../../../../util/navigation/navUtils';
import useEmailVerificationVerify from '../../hooks/useEmailVerificationVerify';
import { CardError } from '../../types';
import {
  selectContactVerificationId,
  selectSelectedCountry,
  setOnboardingId,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';

const ConfirmEmail = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [confirmCode, setConfirmCode] = useState('');
  const selectedCountry = useSelector(selectSelectedCountry);
  const contactVerificationId = useSelector(selectContactVerificationId);

  const { email, password } = useParams<{
    email: string;
    password: string;
  }>();

  const {
    verifyEmailVerification,
    isLoading: verifyLoading,
    isError: verifyIsError,
    error: verifyError,
    reset: resetVerifyEmailVerification,
  } = useEmailVerificationVerify();

  const handleConfirmCodeChange = useCallback(
    (text: string) => {
      resetVerifyEmailVerification();
      setConfirmCode(text);
    },
    [resetVerifyEmailVerification],
  );

  const handleContinue = async () => {
    if (
      !selectedCountry ||
      !email ||
      !password ||
      !confirmCode ||
      !contactVerificationId
    ) {
      return;
    }
    try {
      const { onboardingId } = await verifyEmailVerification(
        {
          email,
          password,
          verificationCode: confirmCode,
          contactVerificationId,
          countryOfResidence: selectedCountry,
          allowMarketing: true,
          allowSms: true,
        },
        selectedCountry === 'US' ? 'us' : 'international',
      );
      dispatch(setOnboardingId(onboardingId));
      navigation.navigate(Routes.CARD.ONBOARDING.SET_PHONE_NUMBER);
    } catch (error) {
      if (
        error instanceof CardError &&
        (error.message.includes('Invalid or expired contact verification ID') ||
          error.message.includes('Verification code has expired'))
      ) {
        // navigate back and restart the flow
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
      }
    }
  };

  const isDisabled =
    verifyLoading ||
    verifyIsError ||
    !selectedCountry ||
    !email ||
    !password ||
    !confirmCode ||
    !contactVerificationId;

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings('card.card_onboarding.confirm_email.confirm_code_label')}
      </Label>
      <TextField
        autoCapitalize={'none'}
        onChangeText={handleConfirmCodeChange}
        placeholder={strings(
          'card.card_onboarding.confirm_email.confirm_code_placeholder',
        )}
        numberOfLines={1}
        size={TextFieldSize.Lg}
        value={confirmCode}
        keyboardType="numeric"
        maxLength={255}
        accessibilityLabel={strings(
          'card.card_onboarding.confirm_email.confirm_code_label',
        )}
      />
      {verifyIsError && (
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
          {verifyError}
        </Text>
      )}
    </Box>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.continue_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={isDisabled}
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.confirm_email.title')}
      description={strings('card.card_onboarding.confirm_email.description', {
        email,
      })}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ConfirmEmail;
