import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  FontFamily,
  FontWeight,
  Text,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { VIP_SPLASH_TITLE_GRADIENT_COLORS } from './Vip.constants';

interface VipSplashGradientTitleProps {
  testID: string;
}

const VipSplashGradientTitle: React.FC<VipSplashGradientTitleProps> = ({
  testID,
}) => {
  const tw = useTailwind();

  return (
    <MaskedView
      maskElement={
        <Text
          fontFamily={FontFamily.Hero}
          fontWeight={FontWeight.Regular}
          twClassName="text-center text-[40px] leading-[32px] tracking-[-1.2px] pt-3"
          testID={testID}
        >
          Welcome to Gold Fox Collective and some extra text
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
          twClassName="text-center text-[40px] leading-[32px] tracking-[-1.2px] pt-3"
        >
          Welcome to Gold Fox Collective and some extra text
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default VipSplashGradientTitle;
