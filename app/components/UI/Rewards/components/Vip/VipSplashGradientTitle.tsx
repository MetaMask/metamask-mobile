import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import MarketingMomentTitle from '../../../MarketingMomentTitle';
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
        <MarketingMomentTitle testID={testID} twClassName="w-full text-center">
          {title}
        </MarketingMomentTitle>
      }
      style={tw.style('w-full')}
    >
      <LinearGradient
        colors={VIP_SPLASH_TITLE_GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Sizes the gradient to the mask. Opacity 0 keeps it from covering the gold fill. */}
        <MarketingMomentTitle
          accessibilityRole="text"
          twClassName="w-full text-center opacity-0"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {title}
        </MarketingMomentTitle>
      </LinearGradient>
    </MaskedView>
  );
};

export default VipSplashGradientTitle;
