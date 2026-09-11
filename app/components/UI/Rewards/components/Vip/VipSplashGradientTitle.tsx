import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES,
  VIP_SPLASH_TITLE_FONT_SIZE,
  VIP_SPLASH_TITLE_FONT_SIZE_SMALL,
  VIP_SPLASH_TITLE_GRADIENT_COLORS,
} from './Vip.constants';

const titleColorStyle = { color: VIP_SPLASH_TITLE_GRADIENT_COLORS[0] };
const titleFontStyle = {
  fontFamily: 'MMPoly-Regular',
  fontWeight: '400' as const,
  includeFontPadding: false,
  letterSpacing: 0,
};

interface VipSplashGradientTitleProps {
  testID: string;
}

const VipSplashGradientTitle: React.FC<VipSplashGradientTitleProps> = ({
  testID,
}) => {
  const tw = useTailwind();
  const { height: screenHeight } = useWindowDimensions();
  const title = strings('rewards.vip.splash_title');
  const titleFontSize =
    screenHeight < VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES
      ? VIP_SPLASH_TITLE_FONT_SIZE_SMALL
      : VIP_SPLASH_TITLE_FONT_SIZE;
  const titleStyle = tw.style(
    'text-center pt-[6px]',
    titleFontStyle,
    titleColorStyle,
    {
      fontSize: titleFontSize,
      lineHeight: titleFontSize,
    },
  );

  return (
    <MaskedView
      maskElement={
        <Text
          variant={TextVariant.DisplayMd}
          style={titleStyle}
          testID={testID}
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

export default VipSplashGradientTitle;
