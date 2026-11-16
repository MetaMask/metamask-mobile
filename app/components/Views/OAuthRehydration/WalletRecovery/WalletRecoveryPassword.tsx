import React, { useState } from 'react';
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
import { MIN_PASSWORD_LENGTH } from '../../../../util/password';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { LoginViewSelectors } from '../../Login/LoginView.testIds';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export type WalletRecoveryPasswordMode = 'unlock' | 'create';

export interface WalletRecoveryPasswordProps {
  /**
   * `unlock` — existing password from the custom picker (Login-like).
   * `create` — new password after MFA when passwordless recovery is prepared.
   */
  mode?: WalletRecoveryPasswordMode;
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
 * Unlock matches the lock-screen password gate. Create is only used after a
 * verified factor when a recovery secret is enrolled.
 */
const WalletRecoveryPassword = ({
  mode = 'unlock',
  password,
  error = null,
  isLoading = false,
  isDisabled = false,
  keyboardAppearance,
  onChangePassword,
  onSubmit,
  onBack,
}: WalletRecoveryPasswordProps) => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputDisabled = isDisabled || isLoading;
  // Unlock: same as Login — enable once non-empty (min length checked on submit).
  // Create: require ChoosePassword minimum before CTA enables.
  const submitDisabled =
    inputDisabled ||
    (mode === 'create'
      ? password.length < MIN_PASSWORD_LENGTH
      : password.length === 0);

  const title =
    mode === 'create'
      ? strings('wallet_recovery_mfa.create_password_title')
      : strings('wallet_recovery_mfa.verify_title');
  const description =
    mode === 'create'
      ? strings('wallet_recovery_mfa.create_password_description')
      : strings('wallet_recovery_mfa.password_description');
  const ctaLabel =
    mode === 'create'
      ? strings('wallet_recovery_mfa.create_password_cta')
      : strings('login.unlock_button');
  const placeholder =
    mode === 'create'
      ? strings('choose_password.new_password_placeholder')
      : strings('login.password_placeholder');

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
            />
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </Box>
  );
};

export default WalletRecoveryPassword;
