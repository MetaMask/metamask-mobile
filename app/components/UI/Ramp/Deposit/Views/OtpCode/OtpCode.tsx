import React, { useCallback, useState, useEffect, useRef, FC } from 'react';
import { TextInput, View, TouchableOpacity, Linking } from 'react-native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './OtpCode.styles';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
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
import Row from '../../../Aggregator/components/Row';
import { TRANSAK_SUPPORT_URL } from '../../constants';
import PoweredByTransak from '../../components/PoweredByTransak/PoweredByTransak';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';

export interface OtpCodeParams {
  quote: BuyQuote;
  email: string;
}

export const createOtpCodeNavDetails = createNavigationDetails<OtpCodeParams>(
  Routes.DEPOSIT.OTP_CODE,
);

const CELL_COUNT = 6;
const COOLDOWN_TIME = 30;
const MAX_RESET_ATTEMPTS = 3;

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

const OtpCode = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { setAuthToken } = useDepositSDK();
  const { quote, email } = useParams<OtpCodeParams>();
  const [resendButtonState, setResendButtonState] = useState<
    'resend' | 'cooldown' | 'contactSupport' | 'resendError'
  >('resend');
  const [cooldownSeconds, setCooldownSeconds] = useState(COOLDOWN_TIME);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [resetAttemptCount, setResetAttemptCount] = useState(0);

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

          // TODO: We should check KYC status here and navigate accordingly

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
    Linking.openURL(TRANSAK_SUPPORT_URL);
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
        <ScreenLayout.Content style={styles.footerContent}>
          <Button
            size={ButtonSize.Lg}
            onPress={handleSubmit}
            label={strings('deposit.otp_code.submit_button')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            loading={loading}
            isDisabled={loading || value.length !== CELL_COUNT}
            testID="otp-code-submit-button"
          />
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OtpCode;
