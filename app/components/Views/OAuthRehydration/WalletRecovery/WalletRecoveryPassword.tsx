import React, { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonSize,
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
import FooterGlass from '../../../../component-library/components-temp/FooterGlass';
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
  /**
   * Opens reset-wallet / forgot-password. When set, a tertiary CTA is shown so
   * users who cannot unlock are not stuck after MFA.
   */
  onForgotPassword?: () => void;
}

/**
 * Password step of wallet recovery. Matches the lock-screen password gate.
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
  onForgotPassword,
}: WalletRecoveryPasswordProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputDisabled = isDisabled || isLoading;
  // Same as Login — enable once non-empty (min length checked on submit).
  const submitDisabled = inputDisabled || password.length === 0;

  const title = strings('wallet_recovery_mfa.verify_title');
  const description = strings('wallet_recovery_mfa.password_description');
  const ctaLabel = strings('login.unlock_button');
  const placeholder = strings('login.password_placeholder');

  // HelpText alone is not announced reliably (esp. iOS); speak errors explicitly.
  useEffect(() => {
    if (!error) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  return (
    <Box twClassName="flex-1 bg-default" testID={LoginViewSelectors.CONTAINER}>
      <HeaderStandard
        title=""
        onBack={onBack}
        includesTopInset
        backButtonProps={{
          testID: WalletRecoverySelectorsIDs.PASSWORD_BACK,
          isDisabled: isLoading,
        }}
      />

      <KeyboardAwareScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-1 px-4')}
        keyboardShouldPersistTaps="handled"
        // Pre-1.21 reflow behavior so the mt-auto CTA lifts with the keyboard
        mode="layout"
        testID={WalletRecoverySelectorsIDs.PASSWORD_SCREEN}
      >
        <Box twClassName="flex-1 pt-0">
          <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
            {title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4"
          >
            {description}
          </Text>

          <Box twClassName="mt-4 gap-4">
            <TextField
              placeholder={placeholder}
              onChangeText={onChangePassword}
              value={password}
              isDisabled={inputDisabled}
              isError={!!error}
              endAccessory={
                <ButtonIcon
                  iconName={
                    isPasswordVisible ? IconName.EyeSlash : IconName.Eye
                  }
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
                accessibilityLabel: placeholder,
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
                accessibilityLiveRegion="polite"
              >
                {error}
              </HelpText>
            ) : null}
          </Box>

          {/* FooterGlass has no style prop; pad below the CTA for the home indicator. */}
          <Box
            twClassName="w-full mt-auto pt-2"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <FooterGlass
              twClassName="px-0 w-full"
              primaryButtonProps={{
                children: ctaLabel,
                onPress: onSubmit,
                isDisabled: submitDisabled,
                isLoading,
                size: ButtonSize.Lg,
                testID: LoginViewSelectors.LOGIN_BUTTON_ID,
              }}
              tertiaryButtonProps={
                onForgotPassword
                  ? {
                      children: strings('login.forgot_password'),
                      onPress: onForgotPassword,
                      isDisabled: isLoading,
                      size: ButtonSize.Lg,
                      testID: LoginViewSelectors.RESET_WALLET,
                    }
                  : undefined
              }
            />
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </Box>
  );
};

export default WalletRecoveryPassword;
