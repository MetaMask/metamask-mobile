import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  FontFamily,
  FontWeight,
  Text,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { VIP_SPLASH_TITLE_GRADIENT_COLORS } from './Vip.constants';

interface VipSplashGradientTitleProps {
  testID: string;
}

const VipSplashGradientTitle: React.FC<VipSplashGradientTitleProps> = ({
  testID,
}) => {
  const tw = useTailwind();
  const title = strings('rewards.vip.splash_title');

  return (
    <MaskedView
      maskElement={
        <Text
          fontFamily={FontFamily.Hero}
          fontWeight={FontWeight.Regular}
          twClassName="text-center text-[60px] leading-[60px] tracking-[-1.2px]"
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
          fontFamily={FontFamily.Hero}
          fontWeight={FontWeight.Regular}
          twClassName="text-center opacity-0 text-[60px] leading-[60px] tracking-[-1.2px]"
        >
          {title}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default VipSplashGradientTitle;
