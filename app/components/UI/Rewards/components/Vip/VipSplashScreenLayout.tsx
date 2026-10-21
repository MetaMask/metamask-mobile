import React, { type ReactNode } from 'react';
import { Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Theme, useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import VipSplashFox from '../../../../../images/rewards/vip_splash.png';
import MarketingMoment from '../../../MarketingMoment';
import {
  VIP_GOLD_TEXT_DEFAULT,
  VIP_GOLD_TEXT_MUTED,
  VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
  VIP_SPLASH_BACKGROUND_GRADIENT_COLORS,
} from './Vip.constants';
import VipSplashGradientTitle from './VipSplashGradientTitle';

// The fox sits in the top of the PNG with its shadow and transparent padding
// below, so the image is shifted down to center the fox itself.
const VIP_SPLASH_FOX_OFFSET = '12%';

const primaryButtonStyle = {
  backgroundColor: VIP_GOLD_TEXT_DEFAULT,
  borderColor: VIP_GOLD_TEXT_DEFAULT,
};
const primaryButtonTextStyle = { color: VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND };
const secondaryButtonTextStyle = { color: VIP_GOLD_TEXT_MUTED };

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
  children?: ReactNode;
}

const VipSplashScreenLayout: React.FC<VipSplashScreenLayoutProps> = ({
  testIDs,
  onPrimaryPress,
  onNotNow,
  primaryButtonLabel,
  children,
}) => {
  const tw = useTailwind();

  return (
    <MarketingMoment
      testID={testIDs.container}
      theme={Theme.Dark}
      background={
        <LinearGradient
          colors={VIP_SPLASH_BACKGROUND_GRADIENT_COLORS}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={tw.style('flex-1')}
        />
      }
      title={
        <VipSplashGradientTitle
          title={strings('rewards.vip.splash_title')}
          testID={testIDs.title}
        />
      }
      description={strings('rewards.vip.splash_description')}
      descriptionProps={{
        testID: testIDs.description,
        twClassName: 'text-center px-6',
      }}
      artwork={
        <Image
          source={VipSplashFox}
          style={[
            tw.style('h-full w-full max-w-[320px]'),
            { transform: [{ translateY: VIP_SPLASH_FOX_OFFSET }] },
          ]}
          resizeMode="contain"
          testID={testIDs.fox}
        />
      }
      primaryAction={{
        label: primaryButtonLabel,
        onPress: onPrimaryPress,
        testID: testIDs.primaryButton,
        style: primaryButtonStyle,
        textProps: { style: primaryButtonTextStyle },
      }}
      secondaryAction={{
        label: strings('rewards.vip.splash_not_now'),
        onPress: onNotNow,
        testID: testIDs.notNowButton,
        textProps: { style: secondaryButtonTextStyle },
      }}
    >
      {children}
    </MarketingMoment>
  );
};

export default VipSplashScreenLayout;
