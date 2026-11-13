import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { LoginViewSelectors } from '../../Login/LoginView.testIds';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export interface WalletRecoveryPasswordProps {
  password: string;
  error?: string | null;
  isLoading?: boolean;
  isDisabled?: boolean;
  keyboardAppearance?: 'light' | 'dark';
  onChangePassword: (password: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * Password step of wallet recovery.
 * Matches the "Verify it's you" password frame. The design's authenticator
 * row is intentionally omitted.
 */
const WalletRecoveryPassword = ({
  password,
  error = null,
  isLoading = false,
  isDisabled = false,
  keyboardAppearance,
  onChangePassword,
  onSubmit,
  onBack,
}: WalletRecoveryPasswordProps) => {
  const insets = useSafeAreaInsets();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputDisabled = isDisabled || isLoading;
  const submitDisabled = password.length === 0 || inputDisabled;

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      testID={LoginViewSelectors.CONTAINER}
    >
      <HeaderStandard
        title=""
        onBack={onBack}
        includesTopInset
        backButtonProps={{ isDisabled: isLoading }}
      />

      <Box
        twClassName="px-4"
        testID={WalletRecoverySelectorsIDs.PASSWORD_SCREEN}
      >
        <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
          {strings('wallet_recovery_mfa.verify_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-4"
        >
          {strings('wallet_recovery_mfa.password_description')}
        </Text>

        <Box twClassName="mt-4 gap-4">
          <TextField
            placeholder={strings('login.password_placeholder')}
            onChangeText={onChangePassword}
            value={password}
            isDisabled={inputDisabled}
            isError={!!error}
            endAccessory={
              <ButtonIcon
                iconName={isPasswordVisible ? IconName.EyeSlash : IconName.Eye}
                iconProps={{ color: IconColor.IconAlternative }}
                onPress={() => setIsPasswordVisible((visible) => !visible)}
                isDisabled={inputDisabled}
                accessibilityLabel={strings(
                  isPasswordVisible
                    ? 'wallet_recovery_mfa.hide_password'
                    : 'wallet_recovery_mfa.show_password',
                )}
                testID={WalletRecoverySelectorsIDs.PASSWORD_VISIBILITY}
              />
            }
            inputProps={{
              testID: LoginViewSelectors.PASSWORD_INPUT,
              accessibilityLabel: LoginViewSelectors.PASSWORD_INPUT,
              returnKeyType: 'done',
              autoCapitalize: 'none',
              secureTextEntry: !isPasswordVisible,
              onSubmitEditing: submitDisabled ? undefined : onSubmit,
              keyboardAppearance,
            }}
          />
          {error ? (
            <HelpText
              severity={HelpTextSeverity.Danger}
              testID={LoginViewSelectors.PASSWORD_ERROR}
            >
              {error}
            </HelpText>
          ) : null}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={onSubmit}
            isDisabled={submitDisabled}
            isLoading={isLoading}
            isFullWidth
            testID={LoginViewSelectors.LOGIN_BUTTON_ID}
          >
            {strings('login.unlock_button')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default WalletRecoveryPassword;
