import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { WalletRecoveryVerifySelectorsIDs } from './WalletRecoveryVerify.testIds';

export type WalletRecoveryMethod = 'passkey' | 'password' | 'email' | 'totp';

export interface WalletRecoveryVerifyProps {
  /**
   * Show passkey CTA only when that factor is enrolled. Default off.
   */
  showPasskey?: boolean;
  /**
   * Show password row when the host offers password unlock. Default off.
   */
  showPassword?: boolean;
  /**
   * Show email only when enrolled. Host should also gate by auth connection
   * (e.g. Telegram only — never Google/Apple sign-in email).
   */
  showEmail?: boolean;
  /**
   * Show authenticator app only when that factor is enrolled. Default off.
   */
  showTotp?: boolean;
  isBusy?: boolean;
  /**
   * MFA methods need network; password stays available offline (MFA-882).
   */
  isOffline?: boolean;
  /**
   * Short line after a factor verify failure (MFA-882).
   */
  error?: string | null;
  /**
   * Optional subtitle. Defaults to wallet-recovery copy; Settings change
   * password (MFA-1012) can override when product copy lands.
   */
  description?: string;
  onBack: () => void;
  onSelectMethod: (method: WalletRecoveryMethod) => void;
}

interface MethodRowProps {
  icon: IconName;
  label: string;
  testID: string;
  isDisabled?: boolean;
  onPress: () => void;
}

/**
 * Figma Social login users — full-screen "Verify it's you" fallback (MFA-882).
 * Shown when passkey is cancelled/fails or the user has no passkey.
 */
const MethodRow = ({
  icon,
  label,
  testID,
  isDisabled,
  onPress,
}: MethodRowProps) => {
  const tw = useTailwind();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center rounded-xl bg-muted px-4 py-4',
          pressed && !isDisabled ? 'opacity-80' : undefined,
          isDisabled ? 'opacity-50' : undefined,
        )
      }
    >
      <Icon name={icon} size={IconSize.Lg} color={IconColor.IconDefault} />
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        twClassName="ml-3 flex-1"
      >
        {label}
      </Text>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
    </Pressable>
  );
};

const WalletRecoveryVerify = ({
  // Opt-in: host passes only enrolled / available methods.
  showPasskey = false,
  showPassword = false,
  showEmail = false,
  showTotp = false,
  isBusy = false,
  isOffline = false,
  error = null,
  description,
  onBack,
  onSelectMethod,
}: WalletRecoveryVerifyProps) => {
  const insets = useSafeAreaInsets();
  // Password works offline; MFA factors need network (MFA-882).
  const mfaDisabled = isBusy || isOffline;
  const passwordDisabled = isBusy;
  const hasSecondaryMethods = showPassword || showEmail || showTotp;
  const descriptionText =
    description ?? strings('wallet_recovery_mfa.verify_description');

  const onPasskey = useCallback(() => {
    onSelectMethod('passkey');
  }, [onSelectMethod]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      testID={WalletRecoveryVerifySelectorsIDs.VERIFY_SCREEN}
    >
      <HeaderStandard
        title=""
        onBack={onBack}
        includesTopInset
        backButtonProps={{ isDisabled: isBusy }}
      />

      <Box twClassName="flex-1 px-4 pt-2">
        <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
          {strings('wallet_recovery_mfa.verify_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {descriptionText}
        </Text>

        {isOffline ? (
          <HelpText
            severity={HelpTextSeverity.Warning}
            twClassName="mt-3"
            testID={WalletRecoveryVerifySelectorsIDs.VERIFY_OFFLINE}
          >
            {strings('wallet_recovery_mfa.offline_reason')}
          </HelpText>
        ) : null}

        {error ? (
          <HelpText
            severity={HelpTextSeverity.Danger}
            twClassName="mt-3"
            testID={WalletRecoveryVerifySelectorsIDs.VERIFY_ERROR}
          >
            {error}
          </HelpText>
        ) : null}

        <Box twClassName="mt-8 gap-4">
          {showPasskey ? (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={mfaDisabled}
              onPress={onPasskey}
              testID={WalletRecoveryVerifySelectorsIDs.USE_PASSKEY_BUTTON}
            >
              {strings('wallet_recovery_mfa.use_passkey')}
            </Button>
          ) : null}

          {showPasskey && hasSecondaryMethods ? (
            <Box twClassName="flex-row items-center gap-4">
              <Box twClassName="flex-1 border-t border-muted" />
              <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
                {strings('wallet_recovery_mfa.or')}
              </Text>
              <Box twClassName="flex-1 border-t border-muted" />
            </Box>
          ) : null}

          {hasSecondaryMethods ? (
            <Box twClassName="gap-3">
              {showPassword ? (
                <MethodRow
                  icon={IconName.Lock}
                  label={strings('wallet_recovery_mfa.method_password')}
                  testID={WalletRecoveryVerifySelectorsIDs.METHOD_PASSWORD}
                  isDisabled={passwordDisabled}
                  onPress={() => onSelectMethod('password')}
                />
              ) : null}
              {showEmail ? (
                <MethodRow
                  icon={IconName.Mail}
                  label={strings('wallet_recovery_mfa.method_email')}
                  testID={WalletRecoveryVerifySelectorsIDs.METHOD_EMAIL}
                  isDisabled={mfaDisabled}
                  onPress={() => onSelectMethod('email')}
                />
              ) : null}
              {showTotp ? (
                <MethodRow
                  icon={IconName.QrCode}
                  label={strings('wallet_recovery_mfa.method_totp')}
                  testID={WalletRecoveryVerifySelectorsIDs.METHOD_TOTP}
                  isDisabled={mfaDisabled}
                  onPress={() => onSelectMethod('totp')}
                />
              ) : null}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

export default WalletRecoveryVerify;
