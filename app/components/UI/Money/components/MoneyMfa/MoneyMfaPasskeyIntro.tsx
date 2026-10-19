import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import shieldImage from '../../../../../images/mfa-shield.png';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

const BENEFITS = [
  { icon: IconName.FaceId, labelKey: 'money.mfa.intro_benefit_login' },
  { icon: IconName.Mobile, labelKey: 'money.mfa.intro_benefit_devices' },
  { icon: IconName.Security, labelKey: 'money.mfa.intro_benefit_approve' },
] as const;

interface MoneyMfaPasskeyIntroProps {
  onAddPasskey: () => void;
  /** Pushes the button to the bottom of a full screen; a sheet keeps it inline. */
  isFullScreen?: boolean;
}

/**
 * "Protect your account with a passkey": shield, benefits and the button that
 * starts passkey setup. Shared by the Money intro screen and the home prompt.
 *
 * @param props - The intro's props.
 * @param props.onAddPasskey - Starts passkey setup.
 * @param props.isFullScreen - Whether the intro fills a screen.
 */
const MoneyMfaPasskeyIntro = ({
  onAddPasskey,
  isFullScreen = false,
}: MoneyMfaPasskeyIntroProps) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName={isFullScreen ? 'flex-1 px-4 pb-4' : 'px-4 pb-4'}
      testID={MoneyMfaTestIds.INTRO}
    >
      <Box twClassName="items-center gap-4">
        <Image
          source={shieldImage}
          style={tw.style('w-[88px] h-[88px]')}
          resizeMode="contain"
        />
        <Box twClassName="gap-2">
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('money.mfa.intro_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('money.mfa.intro_description')}
          </Text>
        </Box>
      </Box>
      <Box twClassName="mt-6 rounded-xl bg-muted px-4 py-2">
        {BENEFITS.map(({ icon, labelKey }) => (
          <Box key={labelKey} twClassName="flex-row items-center gap-3 py-3">
            <Icon
              name={icon}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings(labelKey)}
            </Text>
          </Box>
        ))}
      </Box>
      {isFullScreen ? <Box twClassName="flex-1" /> : null}
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onAddPasskey}
        twClassName="mt-6"
        testID={MoneyMfaTestIds.INTRO_BUTTON}
      >
        {strings('money.mfa.intro_cta')}
      </Button>
    </Box>
  );
};

export default MoneyMfaPasskeyIntro;
