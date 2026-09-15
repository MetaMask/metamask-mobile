import React from 'react';
import GoogleIcon from 'images/google.svg';
import AppleIcon from 'images/apple.svg';
import AppleWhiteIcon from 'images/apple-white.svg';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import { colors as commonColors } from '../../../styles/common';

export type SocialLoginProvider = 'google' | 'apple' | 'telegram';

interface SocialLoginProviderIconProps {
  provider: SocialLoginProvider;
  isInverted?: boolean;
  testID?: string;
}

export const SocialLoginProviderIcon = ({
  provider,
  isInverted = false,
  testID,
}: SocialLoginProviderIconProps) => {
  const { themeAppearance } = useTheme();
  const tw = useTailwind();
  const isDark = themeAppearance === AppThemeKey.dark;

  if (provider === 'google') {
    return (
      <GoogleIcon
        fill="currentColor"
        width={24}
        height={24}
        name="google"
        testID={testID}
      />
    );
  }

  if (provider === 'telegram') {
    return (
      <Icon
        name={IconName.Telegram}
        size={IconSize.Lg}
        style={tw.style({ color: commonColors.telegramBlue })}
        testID={testID}
      />
    );
  }

  const useWhiteIcon = isInverted ? !isDark : isDark;
  return useWhiteIcon ? (
    <AppleWhiteIcon
      fill="currentColor"
      width={24}
      height={24}
      name="apple-white"
      testID={testID}
    />
  ) : (
    <AppleIcon
      fill="currentColor"
      width={24}
      height={24}
      name="apple"
      testID={testID}
    />
  );
};

interface SocialLoginProviderButtonsProps {
  googleLabel: string;
  appleLabel: string;
  telegramLabel: string;
  onPressGoogle: () => void;
  onPressApple: () => void;
  onPressTelegram?: () => void;
  googleTestID?: string;
  appleTestID?: string;
  telegramTestID?: string;
}

const SocialLoginProviderButtons = ({
  googleLabel,
  appleLabel,
  telegramLabel,
  onPressGoogle,
  onPressApple,
  onPressTelegram,
  googleTestID,
  appleTestID,
  telegramTestID,
}: SocialLoginProviderButtonsProps) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const buttonStyle = tw.style('border border-muted', {
    backgroundColor: colors.text.default,
  });
  const textProps = {
    style: { color: colors.background.default },
  };

  return (
    <>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={onPressGoogle}
        testID={googleTestID}
        startAccessory={
          <SocialLoginProviderIcon provider="google" isInverted />
        }
        isFullWidth
        size={ButtonSize.Lg}
        style={buttonStyle}
        textProps={textProps}
      >
        {googleLabel}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={onPressApple}
        testID={appleTestID}
        startAccessory={<SocialLoginProviderIcon provider="apple" isInverted />}
        isFullWidth
        size={ButtonSize.Lg}
        style={buttonStyle}
        textProps={textProps}
      >
        {appleLabel}
      </Button>
      {onPressTelegram && (
        <Button
          variant={ButtonVariant.Secondary}
          onPress={onPressTelegram}
          testID={telegramTestID}
          startAccessory={
            <SocialLoginProviderIcon provider="telegram" isInverted />
          }
          isFullWidth
          size={ButtonSize.Lg}
          style={buttonStyle}
          textProps={textProps}
        >
          {telegramLabel}
        </Button>
      )}
    </>
  );
};

export default SocialLoginProviderButtons;
