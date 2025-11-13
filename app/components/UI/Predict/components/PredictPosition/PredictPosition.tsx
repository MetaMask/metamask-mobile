import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { PredictPosition as PredictPositionType } from '../../types';
import {
  formatCents,
  formatPercentage,
  formatPositionSize,
  formatPrice,
} from '../../utils/format';
import styleSheet from './PredictPosition.styles';
import { PredictPositionSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

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
    size,
    optimistic,
  } = position;
  const { styles } = useStyles(styleSheet, {});

  return (
    <TouchableOpacity
      testID={PredictPositionSelectorsIDs.CURRENT_POSITION_CARD}
      style={styles.positionContainer}
      onPress={() => onPress?.(position)}
    >
      <View style={styles.positionImageContainer}>
        <Image source={{ uri: icon }} style={styles.positionImage} />
      </View>
      <View style={styles.positionDetails}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {title}
        </Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {strings(
            size !== 1
              ? 'predict.position_info_plural'
              : 'predict.position_info_singular',
            {
              amount: formatPrice(initialValue, {
                minimumDecimals: 0,
                maximumDecimals: 2,
              }),
              outcome,
              shares: formatPositionSize(size, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              }),
              priceCents: formatCents(avgPrice),
            },
          )}
        </Text>
      </View>
      <View style={styles.positionPnl}>
        {optimistic ? (
          <>
            <Skeleton width={60} height={20} style={styles.skeletonSpacing} />
            <Skeleton width={50} height={16} />
          </>
        ) : (
          <>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {formatPrice(currentValue, { maximumDecimals: 2 })}
            </Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
            >
              {formatPercentage(percentPnl)}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PredictPosition;
