import React, { useCallback, useState, useEffect } from 'react';
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
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useParams } from '../../../../../util/navigation/navUtils';
import useEmailVerificationVerify from '../../hooks/useEmailVerificationVerify';
import { CardError } from '../../types';
import {
  resetOnboardingState,
  selectContactVerificationId,
  selectSelectedCountry,
  setContactVerificationId,
  setOnboardingId,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import { CardActions, CardScreens } from '../../util/metrics';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

const CODE_LENGTH = 6;

const ConfirmEmail = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [confirmCode, setConfirmCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const selectedCountry = useSelector(selectSelectedCountry);
  const contactVerificationId = useSelector(selectContactVerificationId);
  const { trackEvent, createEventBuilder } = useMetrics();
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);

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
      // Filter to only allow numeric input and limit to CODE_LENGTH digits
      const cleanedText = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
      setConfirmCode(cleanedText);
      setLatestValueSubmitted(null);
    },
    [resetVerifyEmailVerification],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.CONFIRM_EMAIL,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleResendVerification = useCallback(async () => {
    if (resendCooldown > 0 || !email) return;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.CONFIRM_EMAIL_RESEND_BUTTON,
        })
        .build(),
    );
    try {
      const { contactVerificationId: newContactVerificationId } =
        await sendEmailVerification(email);
      dispatch(setContactVerificationId(newContactVerificationId));
      setResendCooldown(60); // 1 minute cooldown
    } catch {
      // Allow error message to display
    }
  }, [
    dispatch,
    email,
    resendCooldown,
    sendEmailVerification,
    trackEvent,
    createEventBuilder,
  ]);

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
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.CONFIRM_EMAIL_BUTTON,
          })
          .build(),
      );
      const { onboardingId, hasAccount } = await verifyEmailVerification({
        email,
        password,
        verificationCode: confirmCode,
        contactVerificationId,
        countryOfResidence: selectedCountry?.key || '',
        allowMarketing: true,
        allowSms: true,
      });

      if (onboardingId) {
        dispatch(setOnboardingId(onboardingId));
        navigation.navigate(Routes.CARD.ONBOARDING.SET_PHONE_NUMBER);
      } else if (hasAccount) {
        const navigateToAuthentication = () => {
          navigation.reset({
            index: 0,
            routes: [{ name: Routes.CARD.AUTHENTICATION }],
          });
        };

        navigation.navigate(Routes.CARD.MODALS.ID, {
          screen: Routes.CARD.MODALS.CONFIRM_MODAL,
          params: {
            title: strings('card.card_onboarding.account_exists.title'),
            description: strings(
              'card.card_onboarding.account_exists.description',
              {
                email,
              },
            ),
            confirmAction: {
              label: strings(
                'card.card_onboarding.account_exists.confirm_button',
              ),
              onPress: navigateToAuthentication,
            },
            onClose: navigateToAuthentication,
            icon: IconName.UserCheck,
          },
        });
        dispatch(resetOnboardingState());
      }
    } catch (error) {
      if (
        error instanceof CardError &&
        error.message.includes('Invalid or expired contact verification ID')
      ) {
        // navigate back and restart the flow
        dispatch(resetOnboardingState());
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
      }
    }
  }, [
    confirmCode,
    contactVerificationId,
    dispatch,
    email,
    navigation,
    password,
    selectedCountry,
    verifyEmailVerification,
    trackEvent,
    createEventBuilder,
  ]);

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
    !selectedCountry ||
    !email ||
    !password ||
    !confirmCode ||
    !contactVerificationId;

  const renderFormFields = () => (
    <>
      <Box>
        <TextField
          autoCapitalize={'none'}
          onChangeText={handleConfirmCodeChange}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={confirmCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          accessibilityLabel={strings(
            'card.card_onboarding.confirm_email.code_label',
          )}
          isError={verifyIsError}
          testID="confirm-email-code-field"
          autoFocus
        />
        {verifyIsError && (
          <Text
            testID="confirm-email-error-text"
            variant={TextVariant.BodySm}
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
          testID="confirm-email-resend-verification"
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
                  !email ||
                  !selectedCountry ||
                  emailVerificationIsLoading
                }
              >
                {strings(
                  'card.card_onboarding.confirm_email.resend_verification',
                )}
              </Text>
            </>
          )}
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
      loading={verifyLoading}
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
      stickyActions
    />
  );
};

export default ConfirmEmail;
