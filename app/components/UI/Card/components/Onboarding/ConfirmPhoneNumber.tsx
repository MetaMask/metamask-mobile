import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Platform, TextInputProps } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useParams } from '../../../../../util/navigation/navUtils';
import usePhoneVerificationVerify from '../../hooks/usePhoneVerificationVerify';
import {
  resetOnboardingState,
  selectContactVerificationId,
  selectOnboardingId,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { CardError } from '../../types';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';
import { useCardSDK } from '../../sdk';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';

const CODE_LENGTH = 6;
const autoComplete = Platform.select<TextInputProps['autoComplete']>({
  android: 'sms-otp',
  default: 'one-time-code',
});

const ConfirmPhoneNumber = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { setUser } = useCardSDK();
  const [resendCooldown, setResendCooldown] = useState(60);
  const [confirmCode, setConfirmCode] = useState('');
  const resendInProgressRef = useRef(false);
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { phoneNumber, phoneCountryCode } = useParams<{
    phoneNumber: string;
    phoneCountryCode: string;
  }>();

  const onboardingId = useSelector(selectOnboardingId);
  const contactVerificationId = useSelector(selectContactVerificationId);

  const {
    sendPhoneVerification,
    isLoading: phoneVerificationIsLoading,
    isError: phoneVerificationIsError,
    error: phoneVerificationError,
  } = usePhoneVerificationSend();

  const {
    verifyPhoneVerification,
    isLoading: verifyLoading,
    isError: verifyIsError,
    error: verifyError,
    reset: resetVerifyPhoneVerification,
  } = usePhoneVerificationVerify();

  const handleContinue = useCallback(async () => {
    if (
      !confirmCode ||
      confirmCode.length !== CODE_LENGTH ||
      !onboardingId ||
      !phoneNumber ||
      !phoneCountryCode ||
      !contactVerificationId
    ) {
      return;
    }
    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.CONFIRM_PHONE_NUMBER_BUTTON,
          })
          .build(),
      );
      const { user } = await verifyPhoneVerification({
        onboardingId,
        phoneNumber,
        phoneCountryCode,
        verificationCode: confirmCode,
        contactVerificationId,
      });
      if (user) {
        setUser(user);
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.VERIFY_IDENTITY }],
        });
      }
    } catch (error) {
      if (
        error instanceof CardError &&
        error.message.includes('Phone number does not match')
      ) {
        // navigate back and reset phone
        navigation.navigate(Routes.CARD.ONBOARDING.SET_PHONE_NUMBER);
      } else if (
        error instanceof CardError &&
        (error.message.includes('Invalid or expired contact verification ID') ||
          error.message.includes('Onboarding ID not found'))
      ) {
        // navigate back and restart the flow
        dispatch(resetOnboardingState());
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
      }
    }
  }, [
    confirmCode,
    onboardingId,
    phoneNumber,
    phoneCountryCode,
    contactVerificationId,
    trackEvent,
    createEventBuilder,
    verifyPhoneVerification,
    setUser,
    navigation,
    dispatch,
  ]);

  const handleValueChange = useCallback(
    (text: string) => {
      resetVerifyPhoneVerification();
      // Filter to only allow numeric input and limit to CODE_LENGTH digits
      const cleanedText = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
      setConfirmCode(cleanedText);
      setLatestValueSubmitted(null);
    },
    [resetVerifyPhoneVerification],
  );

  const handleResendVerification = useCallback(async () => {
    if (
      resendCooldown > 0 ||
      !phoneNumber ||
      !phoneCountryCode ||
      !contactVerificationId ||
      phoneVerificationIsLoading
    ) {
      return;
    }
    if (resendInProgressRef.current) {
      return;
    }
    try {
      resendInProgressRef.current = true;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.CONFIRM_PHONE_NUMBER_RESEND_BUTTON,
          })
          .build(),
      );
      await sendPhoneVerification({
        phoneCountryCode,
        phoneNumber,
        contactVerificationId,
      });
      // Set cooldown after successful resend
      setResendCooldown(60);
    } catch {
      // Allow error message to display
    } finally {
      resendInProgressRef.current = false;
    }
  }, [
    resendCooldown,
    phoneNumber,
    phoneCountryCode,
    contactVerificationId,
    phoneVerificationIsLoading,
    sendPhoneVerification,
    trackEvent,
    createEventBuilder,
  ]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.CONFIRM_PHONE_NUMBER,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (
      confirmCode.length === CODE_LENGTH &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      handleContinue();
    }
  }, [confirmCode, handleContinue, latestValueSubmitted]);

  const isDisabled =
    verifyLoading ||
    verifyIsError ||
    !confirmCode ||
    confirmCode.length !== CODE_LENGTH ||
    !onboardingId ||
    !phoneNumber ||
    !phoneCountryCode;

  const renderFormFields = () => (
    <>
      <Box>
        <TextField
          autoCapitalize={'none'}
          onChangeText={handleValueChange}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={confirmCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={autoComplete}
          maxLength={CODE_LENGTH}
          accessibilityLabel={strings(
            'card.card_onboarding.confirm_phone_number.confirm_code_label',
          )}
          isError={verifyIsError}
          testID="confirm-phone-number-code-field"
          autoFocus
        />
        {verifyIsError && (
          <Text
            variant={TextVariant.BodySm}
            testID="confirm-phone-number-code-field-error"
            twClassName="text-error-default"
          >
            {verifyError}
          </Text>
        )}
      </Box>

      {/* Resend verification */}
      <Box twClassName="mt-2">
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-text-alternative"
          testID="confirm-phone-number-resend-verification"
        >
          {resendCooldown > 0 ? (
            strings('card.card_onboarding.confirm_email.resend_cooldown', {
              seconds: resendCooldown,
            })
          ) : (
            <>
              {strings('card.card_onboarding.confirm_email.didnt_receive_code')}
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-text-alternative underline"
                onPress={
                  resendCooldown > 0 ? undefined : handleResendVerification
                }
                disabled={
                  resendCooldown > 0 ||
                  !phoneNumber ||
                  !phoneCountryCode ||
                  !contactVerificationId ||
                  phoneVerificationIsLoading
                }
              >
                {strings(
                  'card.card_onboarding.confirm_email.resend_verification',
                )}
              </Text>
            </>
          )}
        </Text>
        {phoneVerificationIsError && (
          <Text
            variant={TextVariant.BodySm}
            testID="confirm-phone-number-phone-number-error"
            twClassName="text-error-default"
          >
            {phoneVerificationError}
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
      loading={verifyLoading}
      testID="confirm-phone-number-continue-button"
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.confirm_phone_number.title')}
      description={strings(
        'card.card_onboarding.confirm_phone_number.description',
        { phoneNumber: `+${phoneCountryCode} ${phoneNumber}` },
      )}
      formFields={renderFormFields()}
      actions={renderActions()}
      stickyActions
    />
  );
};

export default ConfirmPhoneNumber;
