import MaskedView from '@react-native-masked-view/masked-view';
import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  FontFamily,
  FontWeight,
  Text,
  TextVariant,
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
          variant={TextVariant.DisplayMd}
          fontFamily={FontFamily.Hero}
          fontWeight={FontWeight.Regular}
          twClassName="text-center"
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
          fontFamily={FontFamily.Hero}
          fontWeight={FontWeight.Regular}
          twClassName="text-center opacity-0"
        >
          {title}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

export default VipSplashGradientTitle;
