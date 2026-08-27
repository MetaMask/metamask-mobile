import React, { type ReactNode, useMemo } from 'react';
import { Image, Pressable, useWindowDimensions } from 'react-native';
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
  VIP_SPLASH_FOX_HEIGHT,
  VIP_SPLASH_FOX_WIDTH,
  VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES,
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen =
    screenHeight < VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES;
  const foxDimensions = useMemo(() => {
    if (!isSmallScreen) {
      return { width: VIP_SPLASH_FOX_WIDTH, height: VIP_SPLASH_FOX_HEIGHT };
    }

    const foxWidth = Math.min(screenWidth - 32, 260);
    return {
      width: foxWidth,
      height: Math.round(
        foxWidth * (VIP_SPLASH_FOX_HEIGHT / VIP_SPLASH_FOX_WIDTH),
      ),
    };
  }, [isSmallScreen, screenWidth]);

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
            style={tw.style(isSmallScreen ? 'mt-6' : 'mt-[54px]')}
            testID={testIDs.fox}
            width={foxDimensions.width}
            height={foxDimensions.height}
          />
        </Box>

        <Box
          twClassName={`px-4 ${isSmallScreen ? 'gap-3 pb-3' : 'gap-[18px] pb-[18px]'}`}
        >
          {footerContent}
          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryPress}
            style={tw.style(
              'items-center justify-center rounded-[10px] border',
              isSmallScreen ? 'h-10' : 'h-12',
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
            style={tw.style(
              'items-center justify-center',
              isSmallScreen ? 'h-8' : 'h-9',
            )}
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
