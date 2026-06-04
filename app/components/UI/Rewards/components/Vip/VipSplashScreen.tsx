import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
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
  VIP_SPLASH_TITLE_GRADIENT_COLORS,
} from './Vip.constants';

export const VIP_SPLASH_SCREEN_TEST_IDS = {
  CONTAINER: 'rewards-vip-splash-screen',
  TITLE: 'rewards-vip-splash-title',
  DESCRIPTION: 'rewards-vip-splash-description',
  FOX: 'rewards-vip-splash-fox',
  ACCEPT_BUTTON: 'rewards-vip-splash-accept-button',
  NOT_NOW_BUTTON: 'rewards-vip-splash-not-now-button',
} as const;

interface VipSplashScreenProps {
  onAcceptInvite: () => void;
  onNotNow: () => void;
}

const titleColorStyle = { color: VIP_SPLASH_TITLE_GRADIENT_COLORS[0] };
const titleFontStyle = {
  fontFamily: 'MMPoly-Regular',
  fontWeight: '400' as const,
  includeFontPadding: false,
  letterSpacing: 0,
};
const descriptionColorStyle = { color: VIP_GOLD_TEXT_MUTED };
const acceptButtonBorderStyle = { borderColor: VIP_GOLD_BORDER_DEFAULT };
const acceptButtonBackgroundStyle = {
  backgroundColor: VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
};
const acceptButtonTextStyle = { color: VIP_GOLD_TEXT_DEFAULT };
const notNowButtonTextStyle = { color: VIP_GOLD_TEXT_MUTED };

const VipGradientTitle = () => {
  const tw = useTailwind();
  const title = strings('rewards.vip.splash_title');
  const titleStyle = tw.style(
    'text-center text-[42px] leading-[42px] pt-[6px]',
    titleFontStyle,
    titleColorStyle,
  );

  return (
    <MaskedView
      maskElement={
        <Text
          variant={TextVariant.DisplayMd}
          style={titleStyle}
          testID={VIP_SPLASH_SCREEN_TEST_IDS.TITLE}
        >
          {title}
        </Text>
      }
      style={tw.style('self-stretch')}
    >
      <LinearGradient
        colors={VIP_SPLASH_TITLE_GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tw.style('items-center')}
      >
        <Text
          variant={TextVariant.DisplayMd}
          style={[titleStyle, tw.style('opacity-0')]}
        >
          {title}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

const VipSplashScreen: React.FC<VipSplashScreenProps> = ({
  onAcceptInvite,
  onNotNow,
}) => {
  const tw = useTailwind();

  return (
    <LinearGradient
      colors={VIP_SPLASH_BACKGROUND_GRADIENT_COLORS}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={tw.style('flex-1')}
      testID={VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER}
    >
      <SafeAreaView edges={['top', 'bottom']} style={tw.style('flex-1')}>
        <Box twClassName="flex-1 items-center justify-center px-4 py-4 mt-24">
          <VipGradientTitle />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={tw.style(
              'mt-[18px] max-w-[326px] text-center leading-[22px]',
              descriptionColorStyle,
            )}
            testID={VIP_SPLASH_SCREEN_TEST_IDS.DESCRIPTION}
          >
            {strings('rewards.vip.splash_description')}
          </Text>
          <Image
            source={VipSplashFox}
            style={tw.style('mt-[54px]')}
            testID={VIP_SPLASH_SCREEN_TEST_IDS.FOX}
            width={320}
            height={381}
          />
        </Box>

        <Box twClassName="gap-[18px] px-4 pb-[18px]">
          <Pressable
            accessibilityRole="button"
            onPress={onAcceptInvite}
            style={tw.style(
              'h-12 items-center justify-center rounded-[10px] border',
              acceptButtonBorderStyle,
              acceptButtonBackgroundStyle,
            )}
            testID={VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              style={acceptButtonTextStyle}
            >
              {strings('rewards.vip.splash_accept_invite')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onNotNow}
            style={tw.style('h-9 items-center justify-center')}
            testID={VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON}
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

export default VipSplashScreen;
