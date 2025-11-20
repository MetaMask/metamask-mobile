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
import { PredictPositionSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

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
      testID={PredictPositionSelectorsIDs.RESOLVED_POSITION_CARD}
      style={styles.positionContainer}
      onPress={() => onPress?.(position)}
    >
      <View accessibilityRole="none" accessible={false} style={styles.positionImage}>
        <Image source={{ uri: icon }} style={styles.positionImage} />
      </View>
      <View accessibilityRole="none" accessible={false} style={styles.positionDetails}>
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Default}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodySMMedium}
          color={TextColor.Alternative}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          ${initialValue.toFixed(2)} on {outcome} • Ended{' '}
          {formatRelativeTime(endDate)}
        </Text>
      </View>
      <View accessibilityRole="none" accessible={false}>
        {percentPnl > 0 ? (
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Success}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Won {formatPrice(currentValue, { maximumDecimals: 2 })}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Error}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Lost{' '}
            {formatPrice(initialValue - currentValue, { maximumDecimals: 2 })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PredictPositionResolved;
