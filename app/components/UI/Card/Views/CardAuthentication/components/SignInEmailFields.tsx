import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  TextField,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';
import CardFormField from '../../../components/Onboarding/CardFormField';

interface SignInEmailFieldsProps {
  origin: 'only' | 'fork' | 'resume';
  email: string;
  password: string;
  isPasswordVisible: boolean;
  isForgotPasswordEnabled: boolean;
  usesEmailCode?: boolean;
  showEmailCode?: boolean;
  emailCode?: string;
  resendCooldown?: number;
  isRequestingCode?: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onEmailCodeChange?: (code: string) => void;
  onResendEmailCode?: () => void;
  onTogglePasswordVisibility: () => void;
  onSubmitEditing: () => void;
  onForgotPassword: () => void;
  onBack?: () => void;
}

const SignInEmailFields = ({
  origin,
  email,
  password,
  isPasswordVisible,
  isForgotPasswordEnabled,
  usesEmailCode = false,
  showEmailCode = false,
  emailCode = '',
  resendCooldown = 0,
  isRequestingCode = false,
  onEmailChange,
  onPasswordChange,
  onEmailCodeChange,
  onResendEmailCode,
  onTogglePasswordVisibility,
  onSubmitEditing,
  onForgotPassword,
  onBack,
}: SignInEmailFieldsProps) => {
  const tw = useTailwind();
  const showBack = origin === 'fork' || origin === 'resume';
  const resendLocked = resendCooldown > 0 || isRequestingCode;

  return (
    <Box twClassName="gap-4">
      {showBack && onBack && (
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          style={tw.style('flex-row items-center gap-2 self-start')}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Sm} />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings(
              origin === 'resume'
                ? 'card.card_authentication.resume_back'
                : 'card.card_authentication.fork_email_back',
            )}
          </Text>
        </TouchableOpacity>
      )}

      <CardFormField label={strings('card.card_authentication.email_label')}>
        <TextField
          onChangeText={onEmailChange}
          value={email}
          inputProps={{
            autoCapitalize: 'none',
            autoComplete: 'username',
            numberOfLines: 1,
            returnKeyType: 'next',
            keyboardType: 'email-address',
            maxLength: 255,
            accessibilityLabel: strings('card.card_authentication.email_label'),
            testID: CardAuthenticationSelectors.EMAIL_FIELD,
          }}
        />
      </CardFormField>
      {usesEmailCode ? (
        showEmailCode && (
          <CardFormField
            label={strings('card.card_authentication.email_code_label')}
          >
            <TextField
              onChangeText={onEmailCodeChange}
              value={emailCode}
              inputProps={{
                autoComplete: 'one-time-code',
                keyboardType: 'number-pad',
                maxLength: 6,
                textContentType: 'oneTimeCode',
                accessibilityLabel: strings(
                  'card.card_authentication.email_code_label',
                ),
                testID: CardAuthenticationSelectors.EMAIL_CODE_FIELD,
              }}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              testID={CardAuthenticationSelectors.EMAIL_CODE_RESEND}
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
                    onPress={resendLocked ? undefined : onResendEmailCode}
                    disabled={resendLocked}
                  >
                    {strings(
                      'card.card_otp_authentication.resend_verification',
                    )}
                  </TextButton>
                </>
              )}
            </Text>
          </CardFormField>
        )
      ) : (
        <CardFormField
          label={strings('card.card_authentication.password_label')}
        >
          <TextField
            onChangeText={onPasswordChange}
            value={password}
            endAccessory={
              <ButtonIcon
                iconName={isPasswordVisible ? IconName.EyeSlash : IconName.Eye}
                size={ButtonIconSize.Md}
                onPress={onTogglePasswordVisibility}
                accessibilityLabel={strings(
                  isPasswordVisible
                    ? 'card.card_authentication.hide_password'
                    : 'card.card_authentication.show_password',
                )}
                testID={CardAuthenticationSelectors.PASSWORD_VISIBILITY_TOGGLE}
              />
            }
            inputProps={{
              autoCapitalize: 'none',
              autoComplete: 'password',
              numberOfLines: 1,
              maxLength: 255,
              returnKeyType: 'done',
              onSubmitEditing,
              secureTextEntry: !isPasswordVisible,
              accessibilityLabel: strings(
                'card.card_authentication.password_label',
              ),
              testID: CardAuthenticationSelectors.PASSWORD_FIELD,
            }}
          />
          {isForgotPasswordEnabled && (
            <TouchableOpacity
              onPress={onForgotPassword}
              testID={CardAuthenticationSelectors.FORGOT_PASSWORD_BUTTON}
              style={tw.style('self-end mt-2')}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                twClassName="text-default"
              >
                {strings('card.card_authentication.forgot_password_button')}
              </Text>
            </TouchableOpacity>
          )}
        </CardFormField>
      )}
    </Box>
  );
};

export default SignInEmailFields;
