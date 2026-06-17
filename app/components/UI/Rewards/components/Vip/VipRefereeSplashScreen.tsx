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

export const VIP_REFEREE_SPLASH_SCREEN_TEST_IDS = {
  CONTAINER: 'rewards-vip-referee-splash-screen',
  TITLE: 'rewards-vip-referee-splash-title',
  DESCRIPTION: 'rewards-vip-referee-splash-description',
  FOX: 'rewards-vip-referee-splash-fox',
  REFERRED_BY: 'rewards-vip-referee-splash-referred-by',
  CONTINUE_BUTTON: 'rewards-vip-referee-splash-continue-button',
  NOT_NOW_BUTTON: 'rewards-vip-referee-splash-not-now-button',
} as const;

interface VipRefereeSplashScreenProps {
  onContinue: () => void;
  onNotNow: () => void;
  referredByCode?: string | null;
}

const titleColorStyle = { color: VIP_SPLASH_TITLE_GRADIENT_COLORS[0] };
const titleFontStyle = {
  fontFamily: 'MMPoly-Regular',
  fontWeight: '400' as const,
  includeFontPadding: false,
  letterSpacing: 0,
};
const descriptionColorStyle = { color: VIP_GOLD_TEXT_MUTED };
const referredByColorStyle = { color: VIP_GOLD_TEXT_MUTED };
const continueButtonBorderStyle = { borderColor: VIP_GOLD_BORDER_DEFAULT };
const continueButtonBackgroundStyle = {
  backgroundColor: VIP_SPLASH_ACCEPT_BUTTON_BACKGROUND,
};
const continueButtonTextStyle = { color: VIP_GOLD_TEXT_DEFAULT };
const notNowButtonTextStyle = { color: VIP_GOLD_TEXT_MUTED };

const VipRefereeGradientTitle = () => {
  const tw = useTailwind();
  const title = strings('rewards.vip.referee_splash_title');
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
          testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.TITLE}
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

const VipRefereeSplashScreen: React.FC<VipRefereeSplashScreenProps> = ({
  onContinue,
  onNotNow,
  referredByCode,
}) => {
  const tw = useTailwind();

  return (
    <LinearGradient
      colors={VIP_SPLASH_BACKGROUND_GRADIENT_COLORS}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={tw.style('flex-1')}
      testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTAINER}
    >
      <SafeAreaView edges={['top', 'bottom']} style={tw.style('flex-1')}>
        <Box twClassName="flex-1 items-center justify-center px-4 py-4 mt-24">
          <VipRefereeGradientTitle />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={tw.style(
              'mt-[18px] max-w-[326px] text-center leading-[22px]',
              descriptionColorStyle,
            )}
            testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.DESCRIPTION}
          >
            {strings('rewards.vip.referee_splash_description')}
          </Text>
          <Image
            source={VipSplashFox}
            style={tw.style('mt-[54px]')}
            testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.FOX}
            width={320}
            height={381}
          />
        </Box>

        <Box twClassName="gap-[18px] px-4 pb-[18px]">
          {referredByCode ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              style={tw.style('text-center', referredByColorStyle)}
              testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.REFERRED_BY}
            >
              {strings('rewards.vip.referee_referred_by', {
                code: referredByCode,
              })}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onContinue}
            style={tw.style(
              'h-12 items-center justify-center rounded-[10px] border',
              continueButtonBorderStyle,
              continueButtonBackgroundStyle,
            )}
            testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTINUE_BUTTON}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              style={continueButtonTextStyle}
            >
              {strings('rewards.vip.referee_splash_continue')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onNotNow}
            style={tw.style('h-9 items-center justify-center')}
            testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              style={notNowButtonTextStyle}
            >
              {strings('rewards.vip.referee_splash_not_now')}
            </Text>
          </Pressable>
        </Box>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default VipRefereeSplashScreen;
