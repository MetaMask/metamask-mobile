import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  FontFamily,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { VIP_SPLASH_TITLE_GRADIENT_COLORS } from './Vip.constants';

interface VipSplashGradientTitleProps {
  title: string;
  testID: string;
}

const VipSplashGradientTitle: React.FC<VipSplashGradientTitleProps> = ({
  title,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <MaskedView
      maskElement={
        <Text
          variant={TextVariant.DisplayXl}
          fontFamily={FontFamily.Hero}
          accessibilityRole="header"
          twClassName="w-full text-center leading-[1.1] tracking-[-1.2px]"
          testID={testID}
        >
          {title}
        </Text>
      }
      style={tw.style('w-full')}
    >
      <LinearGradient
        colors={VIP_SPLASH_TITLE_GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Sizes the gradient to the mask. Opacity 0 keeps it from covering the gold fill. */}
        <Text
          variant={TextVariant.DisplayXl}
          fontFamily={FontFamily.Hero}
          twClassName="w-full text-center leading-[1.1] tracking-[-1.2px] opacity-0"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {title}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default VipSplashGradientTitle;
