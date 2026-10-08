import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES,
  VIP_SPLASH_TITLE_GRADIENT_COLORS,
} from './Vip.constants';

const titleColorStyle = { color: VIP_SPLASH_TITLE_GRADIENT_COLORS[0] };
const titleFontStyle = {
  includeFontPadding: false,
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
  // 38px maps to DisplayLg (40). 28px is equidistant from HeadingLg (24) and
  // DisplayMd (32); DisplayMd keeps the splash title on the display scale.
  const titleVariant =
    screenHeight < VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES
      ? TextVariant.DisplayMd
      : TextVariant.DisplayLg;
  const titleStyle = tw.style(
    'text-center pt-[6px]',
    titleFontStyle,
    titleColorStyle,
  );

  return (
    <MaskedView
      maskElement={
        <Text variant={titleVariant} style={titleStyle} testID={testID}>
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
          variant={titleVariant}
          style={[titleStyle, tw.style('opacity-0')]}
        >
          {title}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default VipSplashGradientTitle;
