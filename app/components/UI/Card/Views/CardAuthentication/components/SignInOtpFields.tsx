import React from 'react';
import { Platform, TouchableOpacity, TextInputProps } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  TextField,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

const CODE_LENGTH = 6;
const autoComplete = Platform.select<TextInputProps['autoComplete']>({
  android: 'sms-otp',
  default: 'one-time-code',
});

interface SignInOtpFieldsProps {
  confirmCode: string;
  error: string | null;
  otpError: string | null;
  resendCooldown: number;
  otpLoading: boolean;
  onChangeCode: (text: string) => void;
  onResend: () => void;
}

const SignInOtpFields = ({
  confirmCode,
  error,
  otpError,
  resendCooldown,
  otpLoading,
  onChangeCode,
  onResend,
}: SignInOtpFieldsProps) => (
  <>
    <Box>
      <TextField
        onChangeText={onChangeCode}
        value={confirmCode}
        isError={!!error}
        autoFocus
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
        <Text
          testID={CardAuthenticationSelectors.OTP_CODE_FIELD_ERROR}
          variant={TextVariant.BodySm}
          twClassName="text-error-default"
        >
          {error}
        </Text>
      )}
    </Box>
    <Box twClassName="mt-2">
      <Text
        variant={TextVariant.BodySm}
        twClassName="text-text-alternative"
        testID={CardAuthenticationSelectors.OTP_RESEND_VERIFICATION}
      >
        {resendCooldown > 0 ? (
          strings('card.card_otp_authentication.resend_cooldown', {
            seconds: resendCooldown,
          })
        ) : (
          <>
            {strings('card.card_otp_authentication.didnt_receive_code')}
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative underline"
              onPress={resendCooldown > 0 ? undefined : onResend}
              disabled={resendCooldown > 0 || otpLoading}
            >
              {strings('card.card_otp_authentication.resend_verification')}
            </Text>
          </>
        )}
      </Text>
      {otpError && (
        <Text
          testID={CardAuthenticationSelectors.OTP_ERROR_TEXT}
          variant={TextVariant.BodySm}
          twClassName="text-error-default"
        >
          {otpError}
        </Text>
      )}
    </Box>
  </>
);

export default SignInOtpFields;
export { CODE_LENGTH };
