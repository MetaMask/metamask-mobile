import React, { type ReactNode } from 'react';
import { Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Theme, useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import VipSplashFox from '../../../../../images/rewards/vip_splash.png';
import MarketingMoment from '../../../MarketingMoment';
import { VIP_SPLASH_BACKGROUND_GRADIENT_COLORS } from './Vip.constants';

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
      title={strings('rewards.vip.splash_title')}
      titleProps={{ testID: testIDs.title, numberOfLines: 3 }}
      description={strings('rewards.vip.splash_description')}
      descriptionProps={{ testID: testIDs.description }}
      artwork={
        <Image
          source={VipSplashFox}
          style={tw.style('h-full w-full')}
          resizeMode="contain"
          testID={testIDs.fox}
        />
      }
      primaryAction={{
        label: primaryButtonLabel,
        onPress: onPrimaryPress,
        testID: testIDs.primaryButton,
      }}
      secondaryAction={{
        label: strings('rewards.vip.splash_not_now'),
        onPress: onNotNow,
        testID: testIDs.notNowButton,
      }}
    >
      {children}
    </MarketingMoment>
  );
};

export default VipSplashScreenLayout;
