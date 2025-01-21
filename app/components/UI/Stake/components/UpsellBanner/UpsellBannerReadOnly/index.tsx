import React from 'react';
import { View } from 'react-native';
import { UpsellBannerReadOnlyProps } from '../UpsellBanner.types';
import styleSheet from './UpsellBannerReadOnly.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';

const UpsellBannerReadOnly = ({
  primaryText,
  secondaryText,
  tertiaryText,
}: UpsellBannerReadOnlyProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingMD}>{primaryText}</Text>
      <Text variant={TextVariant.DisplayMD} color={TextColor.Success}>
        {secondaryText}
      </Text>
      <Text color={TextColor.Alternative}>{tertiaryText}</Text>
    </View>
  );
};

export default UpsellBannerReadOnly;
