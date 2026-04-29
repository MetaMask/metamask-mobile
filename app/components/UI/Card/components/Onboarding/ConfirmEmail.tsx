import React, { useCallback, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import TextField from '../../../../../component-library/components/Form/TextField';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useParams } from '../../../../../util/navigation/navUtils';
import useEmailVerificationVerify from '../../hooks/useEmailVerificationVerify';
import { CardError } from '../../types';
import {
  resetOnboardingState,
  selectContactVerificationId,
  setContactVerificationId,
  setOnboardingId,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import { CardActions, CardScreens } from '../../util/metrics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import useRegions from '../../hooks/useRegions';

const CODE_LENGTH = 6;

const ConfirmEmail = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [confirmCode, setConfirmCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const { getRegionByCode } = useRegions();
  const contactVerificationId = useSelector(selectContactVerificationId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);

  const { email, password, countryKey } = useParams<{
    email: string;
    password: string;
    countryKey: string;
  }>();

  const selectedCountry = getRegionByCode(countryKey);

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
        navigation.navigate(Routes.CARD.ONBOARDING.SET_PHONE_NUMBER, {
          countryKey,
        });
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
    countryKey,
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

  useEffect(() => {
    if (
      confirmCode.length === CODE_LENGTH &&
      latestValueSubmitted !== confirmCode &&
      selectedCountry &&
      email &&
      password &&
      contactVerificationId
    ) {
      setLatestValueSubmitted(confirmCode);
      handleContinue();
    }
  }, [
    confirmCode,
    contactVerificationId,
    email,
    handleContinue,
    latestValueSubmitted,
    password,
    selectedCountry,
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
        <TextField
          autoCapitalize={'none'}
          onChangeText={handleConfirmCodeChange}
          numberOfLines={1}
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
    <Box twClassName="flex flex-col items-center justify-center gap-2">
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        isFullWidth
        isDisabled={isDisabled}
        isLoading={verifyLoading}
        testID="confirm-email-continue-button"
      >
        {strings('card.card_onboarding.continue_button')}
      </Button>
      <Text
        variant={TextVariant.BodySm}
        testID="confirm-email-legal-terms"
        twClassName="text-text-alternative text-center"
      >
        {strings('card.card_onboarding.confirm_email.legal_terms')}
      </Text>
    </Box>
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
