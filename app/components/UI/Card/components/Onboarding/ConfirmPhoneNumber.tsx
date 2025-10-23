import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TextInput, StyleSheet } from 'react-native';
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
import {
  CodeField,
  Cursor,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { useStyles } from '../../../../../component-library/hooks';
import { Theme } from '../../../../../util/theme/models';
import usePhoneVerificationVerify from '../../hooks/usePhoneVerificationVerify';
import {
  selectContactVerificationId,
  selectOnboardingId,
  setUser,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { CardError } from '../../types';
import usePhoneVerificationSend from '../../hooks/usePhoneVerificationSend';

const CELL_COUNT = 6;

// Styles for the OTP CodeField
const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    codeFieldRoot: {
      marginTop: 8,
      gap: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    cellRoot: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 8,
    },
    focusCell: {
      borderColor: theme.colors.primary.default,
      borderWidth: 2,
    },
  });
};

const ConfirmPhoneNumber = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { styles } = useStyles(createStyles, {});
  const inputRef = useRef<TextInput>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);

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
      confirmCode.length !== CELL_COUNT ||
      !onboardingId ||
      !phoneNumber ||
      !phoneCountryCode ||
      !contactVerificationId
    ) {
      return;
    }
    try {
      const { user } = await verifyPhoneVerification({
        onboardingId,
        phoneNumber,
        phoneCountryCode,
        verificationCode: confirmCode,
        contactVerificationId,
      });
      if (user) {
        dispatch(setUser(user));
        navigation.navigate(Routes.CARD.ONBOARDING.VERIFY_IDENTITY);
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
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
      }
    }
  }, [
    confirmCode,
    onboardingId,
    phoneNumber,
    phoneCountryCode,
    contactVerificationId,
    verifyPhoneVerification,
    dispatch,
    navigation,
  ]);

  const handleValueChange = useCallback(
    (text: string) => {
      resetVerifyPhoneVerification();
      setConfirmCode(text);
      setLatestValueSubmitted(null);
    },
    [resetVerifyPhoneVerification],
  );

  const handleResendVerification = useCallback(async () => {
    if (
      resendCooldown > 0 ||
      !phoneNumber ||
      !phoneCountryCode ||
      !contactVerificationId
    ) {
      return;
    }
    try {
      await sendPhoneVerification({
        phoneCountryCode,
        phoneNumber,
        contactVerificationId,
      });
      setResendCooldown(30);
    } catch {
      // Allow error message to display
    }
  }, [
    resendCooldown,
    phoneNumber,
    phoneCountryCode,
    contactVerificationId,
    sendPhoneVerification,
  ]);

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

  // Focus management
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: confirmCode,
    setValue: handleValueChange,
  });

  const isDisabled =
    verifyLoading ||
    verifyIsError ||
    !confirmCode ||
    confirmCode.length !== CELL_COUNT ||
    !onboardingId ||
    !phoneNumber ||
    !phoneCountryCode;

  const renderFormFields = () => (
    <>
      <Box>
        <Label>
          {strings(
            'card.card_onboarding.confirm_phone_number.confirm_code_label',
          )}
        </Label>
        <CodeField
          ref={inputRef}
          {...props}
          value={confirmCode}
          onChangeText={handleValueChange}
          cellCount={CELL_COUNT}
          rootStyle={styles.codeFieldRoot}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
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
          testID="confirm-phone-number-code-field"
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
            !phoneNumber ||
            !phoneCountryCode ||
            !contactVerificationId ||
            phoneVerificationIsLoading
          }
          testID="confirm-phone-number-resend-verification"
        >
          {resendCooldown > 0
            ? strings(
                'card.card_onboarding.confirm_phone_number.resend_cooldown',
                {
                  seconds: resendCooldown,
                },
              )
            : strings(
                'card.card_onboarding.confirm_phone_number.resend_verification',
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
      testID="confirm-phone-number-continue-button"
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.confirm_phone_number.title')}
      description={strings(
        'card.card_onboarding.confirm_phone_number.description',
        { phoneNumber: `${phoneCountryCode} ${phoneNumber}` },
      )}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ConfirmPhoneNumber;
