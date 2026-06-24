import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { VIP_SPLASH_TITLE_GRADIENT_COLORS } from './Vip.constants';

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
  const title = strings('rewards.vip.splash_title');
  const titleStyle = tw.style(
    'text-center text-[38px] leading-[38px] pt-[6px]',
    titleFontStyle,
    titleColorStyle,
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
