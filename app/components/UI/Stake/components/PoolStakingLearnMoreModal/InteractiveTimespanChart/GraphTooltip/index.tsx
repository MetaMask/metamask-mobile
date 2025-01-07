import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './GraphTooltip.styles';

export interface GraphTooltipProps {
  title: string;
  subtitle: string;
  color?: string;
}

const GraphTooltip = ({ title, subtitle, color }: GraphTooltipProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.HeadingLG} color={color ?? TextColor.Success}>
        {title}
      </Text>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {subtitle}
      </Text>
    </View>
  );
};

export default GraphTooltip;
