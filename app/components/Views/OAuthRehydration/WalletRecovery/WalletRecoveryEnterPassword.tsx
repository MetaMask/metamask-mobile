import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonSize,
  HeaderStandard,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import HelpText, {
  HelpTextSeverity,
} from '../../../../component-library/components/Form/HelpText';
import { TextVariant as DSTextVariant } from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import FooterGlass from '../../../../component-library/components-temp/FooterGlass';
import Device from '../../../../util/device';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { LoginViewSelectors } from '../../Login/LoginView.testIds';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export interface WalletRecoveryEnterPasswordProps {
  /** Face ID / Touch ID / Fingerprint — used in the Figma reject copy. */
  biometryLabel: string;
  password: string;
  error?: string | null;
  /** Same as Login `loading` — disables field, Unlock loading, Forgot. */
  isLoading?: boolean;
  keyboardAppearance?: 'light' | 'dark';
  onChangePassword: (password: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
}

/**
 * Figma Enter password UI after OS biometrics reject.
 * Unlock button disabled rule matches Login (empty or loading).
 */
const WalletRecoveryEnterPassword = ({
  biometryLabel,
  password,
  error = null,
  isLoading = false,
  keyboardAppearance,
  onChangePassword,
  onSubmit,
  onBack,
  onForgotPassword,
}: WalletRecoveryEnterPasswordProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const ctaSize = Device.isMediumDevice() ? ButtonSize.Md : ButtonSize.Lg;
  // Login Unlock: isDisabled: password.length === 0 || loading
  const unlockDisabled = password.length === 0 || isLoading;

  return (
    <Box twClassName="flex-1 bg-default" testID={LoginViewSelectors.CONTAINER}>
      <HeaderStandard
        title=""
        onBack={onBack}
        includesTopInset
        backButtonProps={{ isDisabled: isLoading }}
      />

      <KeyboardAwareScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-1 px-4')}
        keyboardShouldPersistTaps="handled"
        mode="layout"
        testID={WalletRecoverySelectorsIDs.ENTER_PASSWORD_SCREEN}
      >
        <Box twClassName="flex-1 pt-0">
          <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
            {strings('wallet_recovery_mfa.enter_password_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4"
          >
            {strings('wallet_recovery_mfa.enter_password_biometric_rejected', {
              biometryType: biometryLabel,
            })}
          </Text>

          <Box twClassName="mt-4 gap-2">
            <TextField
              placeholder={strings('login.password_placeholder')}
              onChangeText={onChangePassword}
              value={password}
              isDisabled={isLoading}
              isError={!!error}
              inputProps={{
                testID: LoginViewSelectors.PASSWORD_INPUT,
                accessibilityLabel: LoginViewSelectors.PASSWORD_INPUT,
                returnKeyType: 'done',
                autoCapitalize: 'none',
                secureTextEntry: true,
                onSubmitEditing: unlockDisabled ? undefined : onSubmit,
                keyboardAppearance,
              }}
            />
            {!!error && (
              <HelpText
                severity={HelpTextSeverity.Error}
                variant={DSTextVariant.BodyMD}
                testID={LoginViewSelectors.PASSWORD_ERROR}
              >
                {error}
              </HelpText>
            )}
          </Box>

          <Box
            twClassName="w-full mt-auto pt-2"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <FooterGlass
              twClassName="px-0 w-full"
              primaryButtonProps={{
                children: strings('login.unlock_button'),
                size: ctaSize,
                onPress: onSubmit,
                isDisabled: unlockDisabled,
                isLoading,
                testID: LoginViewSelectors.LOGIN_BUTTON_ID,
              }}
              tertiaryButtonProps={{
                children: strings('login.forgot_password'),
                size: ctaSize,
                onPress: onForgotPassword,
                testID: LoginViewSelectors.RESET_WALLET,
              }}
            />
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </Box>
  );
};

export default WalletRecoveryEnterPassword;
