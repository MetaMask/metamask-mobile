import React, { type ReactNode } from 'react';
import { Image, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import VipSplashFox from '../../../../../images/rewards/vip_splash.png';
import {
  VIP_GOLD_BORDER_DEFAULT,
  VIP_GOLD_TEXT_DEFAULT,
  VIP_GOLD_TEXT_MUTED,
  VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
  VIP_SPLASH_BACKGROUND_GRADIENT_COLORS,
} from './Vip.constants';
import VipSplashGradientTitle from './VipSplashGradientTitle';

export const VIP_SPLASH_SCREEN_TEST_IDS = {
  CONTAINER: 'rewards-vip-splash-screen',
  TITLE: 'rewards-vip-splash-title',
  DESCRIPTION: 'rewards-vip-splash-description',
  FOX: 'rewards-vip-splash-fox',
  ACCEPT_BUTTON: 'rewards-vip-splash-accept-button',
  NOT_NOW_BUTTON: 'rewards-vip-splash-not-now-button',
} as const;

export const VIP_REFEREE_SPLASH_SCREEN_TEST_IDS = {
  CONTAINER: 'rewards-vip-referee-splash-screen',
  TITLE: 'rewards-vip-referee-splash-title',
  DESCRIPTION: 'rewards-vip-referee-splash-description',
  FOX: 'rewards-vip-referee-splash-fox',
  REFERRED_BY: 'rewards-vip-referee-splash-referred-by',
  CONTINUE_BUTTON: 'rewards-vip-referee-splash-continue-button',
  NOT_NOW_BUTTON: 'rewards-vip-referee-splash-not-now-button',
} as const;

export interface VipSplashScreenLayoutTestIDs {
  container: string;
  title: string;
  description: string;
  fox: string;
  primaryButton: string;
  notNowButton: string;
}

interface VipSplashScreenLayoutProps {
  testIDs: VipSplashScreenLayoutTestIDs;
  onPrimaryPress: () => void;
  onNotNow: () => void;
  primaryButtonLabel: string;
  footerContent?: ReactNode;
}

const descriptionColorStyle = { color: VIP_GOLD_TEXT_MUTED };
const primaryButtonBorderStyle = { borderColor: VIP_GOLD_BORDER_DEFAULT };
const primaryButtonBackgroundStyle = {
  backgroundColor: VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
};
const primaryButtonTextStyle = { color: VIP_GOLD_TEXT_DEFAULT };
const notNowButtonTextStyle = { color: VIP_GOLD_TEXT_MUTED };

const VipSplashScreenLayout: React.FC<VipSplashScreenLayoutProps> = ({
  testIDs,
  onPrimaryPress,
  onNotNow,
  primaryButtonLabel,
  footerContent,
}) => {
  const tw = useTailwind();

  return (
    <LinearGradient
      colors={VIP_SPLASH_BACKGROUND_GRADIENT_COLORS}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={tw.style('flex-1')}
      testID={testIDs.container}
    >
      <SafeAreaView edges={['top', 'bottom']} style={tw.style('flex-1')}>
        <Box twClassName="flex-1 items-center justify-center px-4 py-4 mt-24">
          <VipSplashGradientTitle testID={testIDs.title} />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={tw.style(
              'mt-[18px] max-w-[326px] text-center leading-[22px]',
              descriptionColorStyle,
            )}
            testID={testIDs.description}
          >
            {strings('rewards.vip.splash_description')}
          </Text>
          <Image
            source={VipSplashFox}
            style={tw.style('mt-[54px]')}
            testID={testIDs.fox}
            width={320}
            height={381}
          />
        </Box>

        <Box twClassName="gap-[18px] px-4 pb-[18px]">
          {footerContent}
          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryPress}
            style={tw.style(
              'h-12 items-center justify-center rounded-[10px] border',
              primaryButtonBorderStyle,
              primaryButtonBackgroundStyle,
            )}
            testID={testIDs.primaryButton}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              style={primaryButtonTextStyle}
            >
              {primaryButtonLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onNotNow}
            style={tw.style('h-9 items-center justify-center')}
            testID={testIDs.notNowButton}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              style={notNowButtonTextStyle}
            >
              {strings('rewards.vip.splash_not_now')}
            </Text>
          </Pressable>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default VipSplashScreenLayout;
