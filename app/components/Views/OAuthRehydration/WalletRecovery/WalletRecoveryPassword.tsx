import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export interface WalletRecoveryPasswordProps {
  password: string;
  error: string | null;
  isBusy?: boolean;
  isDisabled?: boolean;
  themeAppearance?: 'light' | 'dark';
  /**
   * When true, shows Forgot password (seedless password outdated reset path).
   */
  showForgotPassword?: boolean;
  onBack: () => void;
  onChangePassword: (value: string) => void;
  onContinue: () => void;
  onForgotPassword?: () => void;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

/** Password recovery step after "Verify it's you". */
const WalletRecoveryPassword = ({
  password,
  error,
  isBusy = false,
  isDisabled = false,
  themeAppearance = 'dark',
  showForgotPassword = false,
  onBack,
  onChangePassword,
  onContinue,
  onForgotPassword,
}: WalletRecoveryPasswordProps) => {
  const insets = useSafeAreaInsets();
  const canContinue = password.length > 0 && !isDisabled && !isBusy;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={WalletRecoverySelectorsIDs.PASSWORD_SCREEN}
    >
      <Box
        twClassName="flex-1 bg-default"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <HeaderStandard
          title={strings('wallet_recovery_mfa.method_password')}
          onBack={onBack}
          includesTopInset
          backButtonProps={{ isDisabled: isBusy }}
        />

        <Box twClassName="flex-1 px-4 pt-2">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('wallet_recovery_mfa.password_description')}
          </Text>

          <Box twClassName="mt-4 gap-2">
            <TextField
              placeholder={strings('wallet_recovery_mfa.password_placeholder')}
              onChangeText={onChangePassword}
              value={password}
              isDisabled={isDisabled || isBusy}
              isError={!!error}
              inputProps={{
                testID: WalletRecoverySelectorsIDs.PASSWORD_INPUT,
                accessibilityLabel: WalletRecoverySelectorsIDs.PASSWORD_INPUT,
                returnKeyType: 'done',
                autoCapitalize: 'none',
                secureTextEntry: true,
                onSubmitEditing: canContinue ? onContinue : undefined,
                keyboardAppearance: themeAppearance,
              }}
            />
            {error ? (
              <HelpText
                severity={HelpTextSeverity.Danger}
                testID={WalletRecoverySelectorsIDs.PASSWORD_ERROR}
              >
                {error}
              </HelpText>
            ) : null}
          </Box>
        </Box>

        <Box twClassName="px-4 gap-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!canContinue}
            isLoading={isBusy}
            onPress={onContinue}
            testID={WalletRecoverySelectorsIDs.PASSWORD_CONTINUE}
          >
            {strings('wallet_recovery_mfa.continue')}
          </Button>
          {showForgotPassword && onForgotPassword ? (
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={isBusy}
              onPress={onForgotPassword}
              testID={WalletRecoverySelectorsIDs.PASSWORD_FORGOT}
            >
              {strings('login.forgot_password')}
            </Button>
          ) : null}
        </Box>
      </Box>
    </KeyboardAvoidingView>
  );
};

export default WalletRecoveryPassword;
