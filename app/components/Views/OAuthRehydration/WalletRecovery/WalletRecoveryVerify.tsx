import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
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
   */
  showEmail?: boolean;
  /**
   * When false, hides the authenticator app row.
   */
  showTotp?: boolean;
  isBusy?: boolean;
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
 * Figma Social login users — "Wallet recovery / Verify it's you" picker.
 * Pixel target: board J5wxbuiNyxmKTG92x7JqFT node screenshots under section 1:36.
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
  onBack,
  onSelectMethod,
}: WalletRecoveryVerifyProps) => {
  const insets = useSafeAreaInsets();

  const onPasskey = useCallback(() => {
    onSelectMethod('passkey');
  }, [onSelectMethod]);

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

        <Box twClassName="mt-8 gap-4">
          {showPasskey ? (
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isDisabled={isBusy}
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
                isDisabled={isBusy}
                onPress={() => onSelectMethod('password')}
              />
            ) : null}
            {showEmail ? (
              <MethodRow
                icon={IconName.Mail}
                label={strings('wallet_recovery_mfa.method_email')}
                testID={WalletRecoverySelectorsIDs.METHOD_EMAIL}
                isDisabled={isBusy}
                onPress={() => onSelectMethod('email')}
              />
            ) : null}
            {showTotp ? (
              <MethodRow
                icon={IconName.QrCode}
                label={strings('wallet_recovery_mfa.method_totp')}
                testID={WalletRecoverySelectorsIDs.METHOD_TOTP}
                isDisabled={isBusy}
                onPress={() => onSelectMethod('totp')}
              />
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default WalletRecoveryVerify;
