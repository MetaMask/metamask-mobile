import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, TextInput } from 'react-native';
import {
  Box,
  HelpText,
  HelpTextSeverity,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  TextField,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

const CODE_LENGTH = 6;
// Annotated with the two values used rather than TextInputProps['autoComplete'],
// which is wider than the autoComplete union TextField accepts.
const autoComplete = Platform.select<'sms-otp' | 'one-time-code'>({
  android: 'sms-otp',
  default: 'one-time-code',
});

interface SignInOtpFieldsProps {
  confirmCode: string;
  error: string | null;
  otpError: string | null;
  resendCooldown: number;
  otpLoading: boolean;
  showResend?: boolean;
  isScreenTransitionComplete: boolean;
  onChangeCode: (text: string) => void;
  onResend: () => void;
  /** Replaces the "Resend it" action. MFA uses this for "Start over". */
  resendLabel?: string;
}

const SignInOtpFields = ({
  confirmCode,
  error,
  otpError,
  resendCooldown,
  otpLoading,
  showResend = true,
  isScreenTransitionComplete,
  onChangeCode,
  onResend,
  resendLabel = strings('card.card_otp_authentication.resend_verification'),
}: SignInOtpFieldsProps) => {
  const codeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isScreenTransitionComplete) {
      return;
    }
    codeInputRef.current?.focus();
  }, [isScreenTransitionComplete]);

  useEffect(() => {
    if (!error) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  useEffect(() => {
    if (!otpError) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(otpError);
  }, [otpError]);

  return (
    <Box gap={2}>
      <TextField
        inputRef={codeInputRef}
        onChangeText={onChangeCode}
        value={confirmCode}
        isError={!!error}
        inputProps={{
          autoCapitalize: 'none',
          numberOfLines: 1,
          keyboardType: 'number-pad',
          textContentType: 'oneTimeCode',
          autoComplete,
          maxLength: CODE_LENGTH,
          accessibilityLabel: strings(
            'card.card_otp_authentication.confirm_code_label',
          ),
          testID: CardAuthenticationSelectors.OTP_CODE_FIELD,
        }}
      />
      {error && (
        <HelpText
          severity={HelpTextSeverity.Danger}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={CardAuthenticationSelectors.OTP_CODE_FIELD_ERROR}
        >
          {error}
        </HelpText>
      )}
      {showResend && (
        <>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={CardAuthenticationSelectors.OTP_RESEND_VERIFICATION}
          >
            {resendCooldown > 0 ? (
              strings('card.card_otp_authentication.resend_cooldown', {
                seconds: resendCooldown,
              })
            ) : (
              <>
                {strings('card.card_otp_authentication.didnt_receive_code')}
                <TextButton
                  variant={TextVariant.BodySm}
                  onPress={resendCooldown > 0 ? undefined : onResend}
                  disabled={resendCooldown > 0 || otpLoading}
                >
                  {resendLabel}
                </TextButton>
              </>
            )}
          </Text>
          {otpError && (
            <HelpText
              severity={HelpTextSeverity.Danger}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              testID={CardAuthenticationSelectors.OTP_ERROR_TEXT}
            >
              {otpError}
            </HelpText>
          )}
        </>
      )}
    </Box>
  );
};

export default SignInOtpFields;
export { CODE_LENGTH };
