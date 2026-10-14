import React, { type ReactNode, useMemo } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontWeight } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import VipSplashFox from '../../../../../images/rewards/vip_splash.png';
import MarketingMoment from '../../../MarketingMoment';
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
const primaryButtonStyle = {
  backgroundColor: VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
  borderColor: VIP_GOLD_BORDER_DEFAULT,
  borderWidth: 1,
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
      <MarketingMoment
        twClassName="bg-transparent"
        title={strings('rewards.vip.splash_title')}
        description={strings('rewards.vip.splash_description')}
        descriptionTestIDs={[testIDs.description]}
        descriptionFontWeight={FontWeight.Medium}
        descriptionStyle={descriptionColorStyle}
        descriptionClassName="max-w-[326px]"
        renderTitle={() => <VipSplashGradientTitle testID={testIDs.title} />}
        artwork={
          <Image
            source={VipSplashFox}
            style={tw.style(isSmallScreen ? 'mt-6' : 'mt-[54px]')}
            testID={testIDs.fox}
            width={foxDimensions.width}
            height={foxDimensions.height}
          />
        }
        footerContent={footerContent}
        primaryAction={{
          label: primaryButtonLabel,
          onPress: onPrimaryPress,
          testID: testIDs.primaryButton,
          style: primaryButtonStyle,
          textStyle: primaryButtonTextStyle,
        }}
        secondaryAction={{
          label: strings('rewards.vip.splash_not_now'),
          onPress: onNotNow,
          testID: testIDs.notNowButton,
          textStyle: notNowButtonTextStyle,
        }}
      />
    </LinearGradient>
  );
};

export default VipSplashScreenLayout;
