import React, { useCallback, useEffect } from 'react';
import { AccessibilityInfo, Pressable } from 'react-native';
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
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { WalletRecoverySelectorsIDs } from './WalletRecovery.testIds';

export type WalletRecoveryMethod = 'passkey' | 'password' | 'email' | 'totp';

export interface WalletRecoveryVerifyProps {
  /**
   * When false, hides the primary passkey CTA (method not enrolled / unavailable).
   */
  showPasskey?: boolean;
  /**
   * When false, hides the password row (e.g. already unlocked).
   */
  showPassword?: boolean;
  /**
   * When false, hides the email recovery row.
   * MFA-882: only Telegram may show email; Google/Apple sign-in email is filtered out.
   */
  showEmail?: boolean;
  /**
   * When false, hides the authenticator app row.
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
  onBack: () => void;
  /**
   * "Can't use any of these?" → return to social login (MFA-882).
   */
  onCantUseThese: () => void;
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
  showPasskey = true,
  showPassword = true,
  showEmail = true,
  showTotp = true,
  isBusy = false,
  isOffline = false,
  error = null,
  onBack,
  onCantUseThese,
  onSelectMethod,
}: WalletRecoveryVerifyProps) => {
  const insets = useSafeAreaInsets();
  // Password works offline; MFA factors need network (MFA-882).
  const mfaDisabled = isBusy || isOffline;
  const passwordDisabled = isBusy;

  const onPasskey = useCallback(() => {
    onSelectMethod('passkey');
  }, [onSelectMethod]);

  // WCAG 4.1.3 / 3.3.1: announce status and errors for VoiceOver / TalkBack.
  useEffect(() => {
    if (!error) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  useEffect(() => {
    if (!isOffline) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      strings('wallet_recovery_mfa.offline_reason'),
    );
  }, [isOffline]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      testID={WalletRecoverySelectorsIDs.VERIFY_SCREEN}
    >
      <HeaderStandard
        title={strings('wallet_recovery_mfa.header')}
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
          {strings('wallet_recovery_mfa.verify_description')}
        </Text>

        {isOffline ? (
          <HelpText
            severity={HelpTextSeverity.Warning}
            twClassName="mt-3"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={WalletRecoverySelectorsIDs.VERIFY_OFFLINE}
          >
            {strings('wallet_recovery_mfa.offline_reason')}
          </HelpText>
        ) : null}

        {error ? (
          <HelpText
            severity={HelpTextSeverity.Danger}
            twClassName="mt-3"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID={WalletRecoverySelectorsIDs.VERIFY_ERROR}
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
              testID={WalletRecoverySelectorsIDs.USE_PASSKEY_BUTTON}
            >
              {strings('wallet_recovery_mfa.use_passkey')}
            </Button>
          ) : null}

          {showPasskey ? (
            <Box twClassName="flex-row items-center gap-4">
              <Box twClassName="flex-1 border-t border-muted" />
              <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
                {strings('wallet_recovery_mfa.or')}
              </Text>
              <Box twClassName="flex-1 border-t border-muted" />
            </Box>
          ) : null}

          <Box twClassName="gap-3">
            {showPassword ? (
              <MethodRow
                icon={IconName.Lock}
                label={strings('wallet_recovery_mfa.method_password')}
                testID={WalletRecoverySelectorsIDs.METHOD_PASSWORD}
                isDisabled={passwordDisabled}
                onPress={() => onSelectMethod('password')}
              />
            ) : null}
            {showEmail ? (
              <MethodRow
                icon={IconName.Mail}
                label={strings('wallet_recovery_mfa.method_email')}
                testID={WalletRecoverySelectorsIDs.METHOD_EMAIL}
                isDisabled={mfaDisabled}
                onPress={() => onSelectMethod('email')}
              />
            ) : null}
            {showTotp ? (
              <MethodRow
                icon={IconName.QrCode}
                label={strings('wallet_recovery_mfa.method_totp')}
                testID={WalletRecoverySelectorsIDs.METHOD_TOTP}
                isDisabled={mfaDisabled}
                onPress={() => onSelectMethod('totp')}
              />
            ) : null}
          </Box>
        </Box>
      </Box>

      <Box twClassName="px-4 items-center">
        <TextButton
          variant={TextVariant.BodyMd}
          onPress={onCantUseThese}
          disabled={isBusy}
          accessibilityState={{ disabled: isBusy }}
          twClassName={isBusy ? 'opacity-50' : undefined}
          testID={WalletRecoverySelectorsIDs.CANT_USE_THESE}
        >
          {strings('wallet_recovery_mfa.cant_use_these')}
        </TextButton>
      </Box>
    </Box>
  );
};

export default WalletRecoveryVerify;
