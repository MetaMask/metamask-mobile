import React, { useCallback, useState, useEffect, useRef, FC } from 'react';
import { TextInput, View, TouchableOpacity } from 'react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './OtpCode.styles';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { strings } from '../../../../../../../locales/i18n';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { getDepositNavbarOptions } from '../../../../Navbar';
import DepositProgressBar from '../../components/DepositProgressBar';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { createVerifyIdentityNavDetails } from '../VerifyIdentity/VerifyIdentity';
import { useDepositSDK } from '../../sdk';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import Row from '../../../Aggregator/components/Row';

const ResendButton: FC<{
  onPress: VoidFunction;
  text: string;
  button: string;
}> = ({ onPress, text, button }) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <>
      <Text style={styles.resendButtonText}>{strings(text)}</Text>
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.contactSupportButton}>{strings(button)}</Text>
      </TouchableOpacity>
    </>
  );
};

export const createOtpCodeNavDetails = createNavigationDetails(
  Routes.DEPOSIT.OTP_CODE,
);

const CELL_COUNT = 6;
const COOLDOWN_TIME = 30;
const MAX_RESET_ATTEMPTS = 3;

const OtpCode = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { email, setAuthToken } = useDepositSDK();
  const [resendButtonState, setResendButtonState] = useState<
    'resend' | 'cooldown' | 'contactSupport' | 'resendError'
  >('resend');
  const [cooldownSeconds, setCooldownSeconds] = useState(COOLDOWN_TIME);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [resetAttemptCount, setResetAttemptCount] = useState(0);

  const route =
    useRoute<RouteProp<Record<string, { quote: BuyQuote }>, string>>();
  const { quote } = route.params;

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.otp_code.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const [value, setValue] = useState('');

  const inputRef = useBlurOnFulfill({ value, cellCount: CELL_COUNT }) || null;
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const [{ error, isFetching: loading, data: response }, submitCode] =
    useDepositSdkMethod(
      { method: 'verifyUserOtp', onMount: false },
      email,
      value,
    );

  const [, resendOtp] = useDepositSdkMethod(
    { method: 'sendUserOtp', onMount: false },
    email,
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  useEffect(() => {
    const saveTokenAndNavigate = async () => {
      if (response) {
        try {
          await setAuthToken(response);
          navigation.navigate(...createVerifyIdentityNavDetails({ quote }));
        } catch (e) {
          console.error('Failed to store auth token:', e);
        }
      }
    };

    saveTokenAndNavigate();
  }, [response, setAuthToken, navigation, quote]);

  useEffect(() => {
    if (resendButtonState === 'cooldown' && cooldownSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    } else if (cooldownSeconds === 0) {
      setResendButtonState('resend');
      setCooldownSeconds(COOLDOWN_TIME);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resendButtonState, cooldownSeconds]);

  const handleResend = useCallback(async () => {
    try {
      if (resetAttemptCount > MAX_RESET_ATTEMPTS) {
        setResendButtonState('contactSupport');
        return;
      }
      setResetAttemptCount((prev) => prev + 1);
      setResendButtonState('cooldown');
      await resendOtp();
    } catch (e) {
      setResendButtonState('resendError');
    }
  }, [resendOtp, resetAttemptCount]);

  const handleContactSupport = useCallback(() => {
    // navigate user to the contact support screen
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!loading && value.length === CELL_COUNT) {
      await submitCode();
    }
  }, [loading, submitCode, value.length]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={1} />
          <Text>{strings('deposit.otp_code.description', { email })}</Text>
          <CodeField
            testID="otp-code-input"
            ref={inputRef as React.RefObject<TextInput>}
            {...props}
            value={value}
            onChangeText={setValue}
            cellCount={CELL_COUNT}
            rootStyle={styles.codeFieldRoot}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            renderCell={({ index, symbol, isFocused }) => (
              <View
                onLayout={getCellOnLayoutHandler(index)}
                key={index}
                style={[styles.cellRoot, isFocused && styles.focusCell]}
              >
                <Text style={styles.cellText}>
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              </View>
            )}
          />

          {error && (
            <Text style={{ color: theme.colors.error.default }}>{error}</Text>
          )}

          <Row style={styles.resendButtonContainer}>
            {resendButtonState === 'resend' ? (
              <ResendButton
                onPress={handleResend}
                text="deposit.otp_code.resend_code_description"
                button="deposit.otp_code.resend_code_button"
              />
            ) : resendButtonState === 'cooldown' ? (
              <Text style={styles.resendButtonText}>
                {strings('deposit.otp_code.resend_cooldown', {
                  seconds: cooldownSeconds,
                })}
              </Text>
            ) : resendButtonState === 'contactSupport' ? (
              <ResendButton
                onPress={handleContactSupport}
                text="deposit.otp_code.need_help"
                button="deposit.otp_code.contact_support"
              />
            ) : resendButtonState === 'resendError' ? (
              <ResendButton
                onPress={handleContactSupport}
                text="deposit.otp_code.resend_error"
                button="deposit.otp_code.contact_support"
              />
            ) : null}
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={handleSubmit}
            accessibilityRole="button"
            accessible
            disabled={loading || value.length !== CELL_COUNT}
          >
            {loading
              ? strings('deposit.otp_code.loading')
              : strings('deposit.otp_code.submit_button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OtpCode;
