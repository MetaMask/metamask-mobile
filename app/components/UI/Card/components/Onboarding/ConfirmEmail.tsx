import React, { useCallback, useState, useEffect, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Label from '../../../../../component-library/components/Form/Label';
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
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { useStyles } from '../../../../hooks/useStyles';
import { createOTPStyles } from './ConfirmPhoneNumber';
import { Platform, TextInput, TextInputProps, View } from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

const CELL_COUNT = 6;
const autoComplete = Platform.select<TextInputProps['autoComplete']>({
  android: 'sms-otp',
  default: 'one-time-code',
});

const ConfirmEmail = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [confirmCode, setConfirmCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const selectedCountry = useSelector(selectSelectedCountry);
  const contactVerificationId = useSelector(selectContactVerificationId);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { toastRef } = useContext(ToastContext);
  const { styles } = useStyles(createOTPStyles, {});
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);

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
    theme,
    password,
    selectedCountry,
    verifyEmailVerification,
    trackEvent,
    createEventBuilder,
    toastRef,
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

  const inputRef =
    useBlurOnFulfill({
      value: confirmCode,
      cellCount: CELL_COUNT,
    }) || null;

  // Focus management
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (
      confirmCode.length === CELL_COUNT &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      handleContinue();
    }
  }, [confirmCode, handleContinue, latestValueSubmitted]);

  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: confirmCode,
    setValue: handleConfirmCodeChange,
  });

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
        <CodeField
          ref={inputRef as React.RefObject<TextInput>}
          {...props}
          value={confirmCode}
          onChangeText={handleConfirmCodeChange}
          cellCount={CELL_COUNT}
          rootStyle={styles.codeFieldRoot}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={autoComplete}
          renderCell={({ index, symbol, isFocused }) => (
            <View
              onLayout={getCellOnLayoutHandler(index)}
              key={index}
              style={[styles.cellRoot, isFocused && styles.focusCell]}
            >
              <Text
                variant={TextVariant.BodyLg}
                twClassName="text-text-default font-bold text-center"
              >
                {symbol || (isFocused ? <Cursor /> : null)}
              </Text>
            </View>
          )}
          testID="confirm-email-code-field"
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
      <Box twClassName="mt-4 items-center">
        <Text
          variant={TextVariant.BodyMd}
          twClassName={`${
            resendCooldown > 0
              ? 'text-text-alternative'
              : 'text-primary-default cursor-pointer'
          }`}
          onPress={resendCooldown > 0 ? undefined : handleResendVerification}
          disabled={
            resendCooldown > 0 ||
            !email ||
            !selectedCountry ||
            emailVerificationIsLoading
          }
          testID="confirm-email-resend-verification"
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
