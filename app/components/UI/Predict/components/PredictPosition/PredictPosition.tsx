import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PredictPosition.styles';

interface PredictPositionProps {
  title?: string;
  position?: number;
  price?: number;
  change?: number;
  volume?: number;
  outcome?: string;
}

const PredictPosition: React.FC<PredictPositionProps> = ({
  title,
  position,
  price,
  change,
  outcome,
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.positionContainer}>
      <View style={styles.positionHeader}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {title}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          ${position}
        </Text>
      </View>
      <View style={styles.positionDetail}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          ${price} on {outcome}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Success}>
          {change}%
        </Text>
      </View>
    </View>
  );
};

export default PredictPosition;
