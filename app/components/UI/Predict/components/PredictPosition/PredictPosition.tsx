import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { PredictPosition as PredictPositionType } from '../../types';
import { formatPercentage, formatPrice } from '../../utils/format';
import styleSheet from './PredictPosition.styles';

interface PredictPositionProps {
  position: PredictPositionType;
  onPress?: (position: PredictPositionType) => void;
}

const PredictPosition: React.FC<PredictPositionProps> = ({
  position,
  onPress,
}: PredictPositionProps) => {
  const {
    icon,
    title,
    initialValue,
    percentPnl,
    outcome,
    avgPrice,
    currentValue,
  } = position;
  const { styles } = useStyles(styleSheet, {});

  return (
    <TouchableOpacity
      style={styles.positionContainer}
      onPress={() => onPress?.(position)}
    >
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
          {formatPrice(currentValue, { maximumDecimals: 2 })}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
        >
          {formatPercentage(percentPnl)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default PredictPosition;
