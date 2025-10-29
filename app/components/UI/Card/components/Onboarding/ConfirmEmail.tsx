import React, { useCallback, useState, useEffect, useContext } from 'react';
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
  setContactVerificationId,
  setOnboardingId,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';

const ConfirmEmail = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [confirmCode, setConfirmCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const selectedCountry = useSelector(selectSelectedCountry);
  const contactVerificationId = useSelector(selectContactVerificationId);
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();

  const { email, password } = useParams<{
    email: string;
    password: string;
  }>();

  const {
    sendEmailVerification,
    isLoading: emailVerificationIsLoading,
    isError: emailVerificationIsError,
    error: emailVerificationError,
  } = useEmailVerificationSend();

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

  // Cooldown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const handleResendVerification = useCallback(async () => {
    if (resendCooldown > 0 || !email) return;

    try {
      const { contactVerificationId } = await sendEmailVerification(email);
      dispatch(setContactVerificationId(contactVerificationId));
      setResendCooldown(60); // 1 minute cooldown
    } catch {
      // Allow error message to display
    }
  }, [dispatch, email, resendCooldown, sendEmailVerification]);

  const handleContinue = useCallback(async () => {
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
      const { onboardingId, hasAccount } = await verifyEmailVerification({
        email,
        password,
        verificationCode: confirmCode,
        contactVerificationId,
        countryOfResidence: selectedCountry,
        allowMarketing: true,
        allowSms: true,
      });

      if (onboardingId) {
        dispatch(setOnboardingId(onboardingId));
        navigation.navigate(Routes.CARD.ONBOARDING.SET_PHONE_NUMBER);
      } else if (hasAccount) {
        navigation.navigate(Routes.CARD.AUTHENTICATION);
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          hasNoTimeout: false,
          iconName: IconName.Info,
          iconColor: theme.colors.info.default,
          labelOptions: [
            {
              label: strings(
                'card.card_onboarding.confirm_email.account_exists',
              ),
              isBold: true,
            },
          ],
        });
      }
    } catch (error) {
      if (
        error instanceof CardError &&
        error.message.includes('Invalid or expired contact verification ID')
      ) {
        // navigate back and restart the flow
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
      }
    }
  }, [
    confirmCode,
    contactVerificationId,
    dispatch,
    email,
    navigation,
    theme,
    password,
    selectedCountry,
    verifyEmailVerification,
    toastRef,
  ]);

  const isDisabled =
    verifyLoading ||
    verifyIsError ||
    !selectedCountry ||
    !email ||
    !password ||
    !confirmCode ||
    !contactVerificationId;

  const renderFormFields = () => (
    <>
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
          testID="confirm-code-input"
        />
        {verifyIsError && (
          <Text
            testID="confirm-code-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {verifyError}
          </Text>
        )}
      </Box>

      {/* Resend verification */}
      <Box>
        <Text
          variant={TextVariant.BodySm}
          twClassName={`${
            resendCooldown > 0
              ? 'text-text-muted'
              : 'text-primary-default cursor-pointer'
          }`}
          onPress={resendCooldown > 0 ? undefined : handleResendVerification}
          disabled={
            resendCooldown > 0 ||
            !email ||
            !selectedCountry ||
            emailVerificationIsLoading
          }
          testID="resend-verification-text"
        >
          {resendCooldown > 0
            ? strings('card.card_onboarding.confirm_email.resend_cooldown', {
                seconds: resendCooldown,
              })
            : strings('card.card_onboarding.confirm_email.resend_verification')}
        </Text>
        {emailVerificationIsError && (
          <Text
            testID="confirm-email-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {emailVerificationError}
          </Text>
        )}
      </Box>
    </>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.continue_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={isDisabled}
      testID="confirm-email-continue-button"
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
