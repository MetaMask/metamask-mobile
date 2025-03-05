import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import styleSheet from './UpsellBanner.styles';
import { UPSELL_BANNER_VARIANTS } from './UpsellBanner.types';

interface UpsellBannerProps {
  primaryText: string;
  secondaryText?: string;
  tertiaryText?: string;
  variant?: UPSELL_BANNER_VARIANTS;
}

const UpsellBanner = ({
  primaryText,
  secondaryText,
  tertiaryText,
  variant = UPSELL_BANNER_VARIANTS.DEFAULT,
}: UpsellBannerProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={[styles.container, styles[variant]]}>
      <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
        {primaryText}
      </Text>
      {secondaryText && (
        <Text variant={TextVariant.HeadingMD} color={TextColor.Success}>
          {secondaryText}
        </Text>
      )}
      {tertiaryText && (
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {tertiaryText}
        </Text>
      )}
    </View>
  );
};

export default UpsellBanner;
