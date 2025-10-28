import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { PredictPosition as PredictPositionType } from '../../types';
import { formatPrice } from '../../utils/format';
import styleSheet from './PredictPositionResolved.styles';
import { getPredictPositionSelector } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

dayjs.extend(relativeTime);

/**
 * Formats a date string as relative time (e.g., "1 minute ago", "2 hours ago")
 * @param dateString - The date string to format
 * @returns Formatted relative time string
 */
const formatRelativeTime = (dateString: string): string => {
  const date = dayjs(dateString);
  return date.fromNow();
};

interface PredictPositionResolvedProps {
  position: PredictPositionType;
  onPress?: (position: PredictPositionType) => void;
}

const PredictPositionResolved: React.FC<PredictPositionResolvedProps> = ({
  position,
  onPress,
}: PredictPositionResolvedProps) => {
  const {
    icon,
    title,
    initialValue,
    outcome,
    currentValue,
    endDate,
    percentPnl,
  } = position;
  const { styles } = useStyles(styleSheet, {});

  return (
    <TouchableOpacity
      testID={getPredictPositionSelector.resolvedPositionCard(position.id)}
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
          ${initialValue.toFixed(2)} on {outcome} • Ended{' '}
          {formatRelativeTime(endDate)}
        </Text>
      </View>
      <View>
        {percentPnl > 0 ? (
          <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
            Won {formatPrice(currentValue, { maximumDecimals: 2 })}
          </Text>
        ) : (
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            Lost{' '}
            {formatPrice(initialValue - currentValue, { maximumDecimals: 2 })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PredictPositionResolved;
