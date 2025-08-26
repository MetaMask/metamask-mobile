import React from 'react';
import { View, Image } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './PredictPosition.styles';
import { Position } from '../../types';
import { formatPrice, formatPercentage } from '../../utils/formatUtils';

interface PredictPositionProps {
  position: Position;
}

const PredictPosition: React.FC<PredictPositionProps> = ({
  position: {
    icon,
    title,
    initialValue,
    percentPnl,
    outcome,
    avgPrice,
    currentValue,
  },
}: PredictPositionProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.positionContainer}>
      <View style={styles.positionImage}>
        <Image source={{ uri: icon }} style={styles.positionImage} />
      </View>
      <View style={styles.positionDetails}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Default}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          ${initialValue.toFixed(2)} on {outcome} •{' '}
          {(avgPrice * 100).toFixed(0)}¢
        </Text>
      </View>
      <View style={styles.positionPnl}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {formatPrice(currentValue, { minimumDecimals: 2 })}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
        >
          {formatPercentage(percentPnl)}
        </Text>
      </View>
    </View>
  );
};

export default PredictPosition;
