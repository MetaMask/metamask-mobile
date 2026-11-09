import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Label,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  TextField,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

interface SignInEmailFieldsProps {
  origin: 'only' | 'fork' | 'resume';
  email: string;
  password: string;
  isPasswordVisible: boolean;
  isForgotPasswordEnabled: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
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
  onEmailChange,
  onPasswordChange,
  onTogglePasswordVisibility,
  onSubmitEditing,
  onForgotPassword,
  onBack,
}: SignInEmailFieldsProps) => {
  const tw = useTailwind();
  const showBack = origin === 'fork' || origin === 'resume';

  return (
    <Box twClassName="gap-4">
      {showBack && onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={tw.style('flex-row items-center gap-2 self-start')}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Sm} />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {strings(
              origin === 'resume'
                ? 'card.card_authentication.resume_back'
                : 'card.card_authentication.fork_email_back',
            )}
          </Text>
        </TouchableOpacity>
      )}

      <Box>
        <Label>{strings('card.card_authentication.email_label')}</Label>
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
      </Box>
      <Box>
        <Label>{strings('card.card_authentication.password_label')}</Label>
        <TextField
          onChangeText={onPasswordChange}
          value={password}
          endAccessory={
            <TouchableOpacity
              onPress={onTogglePasswordVisibility}
              testID={CardAuthenticationSelectors.PASSWORD_VISIBILITY_TOGGLE}
            >
              <Icon
                name={isPasswordVisible ? IconName.EyeSlash : IconName.Eye}
                size={IconSize.Md}
              />
            </TouchableOpacity>
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
      </Box>
    </Box>
  );
};

export default SignInEmailFields;
