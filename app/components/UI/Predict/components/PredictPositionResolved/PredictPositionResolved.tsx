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
import { strings } from '../../../../../../locales/i18n';

dayjs.extend(relativeTime);

/**
 * Formats a market end date, showing relative time or "Resolved early" if the date is in the future
 * @param dateString - The date string to format
 * @returns Formatted relative time string or "Resolved" if date is in the future
 */
const formatMarketEndDate = (dateString: string): string => {
  const date = dayjs(dateString);
  const now = dayjs();

  if (date.isAfter(now)) {
    return strings('predict.market_details.resolved_early');
  }

  return strings('predict.market_details.ended') + ' ' + date.fromNow();
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
      <View style={styles.positionImage}>
        <Image source={{ uri: icon }} style={styles.positionImage} />
      </View>
      <View style={styles.positionDetails}>
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
          {strings('predict.market_details.amount_on_outcome', {
            amount: formatPrice(initialValue, { maximumDecimals: 2 }),
            outcome,
          })}{' '}
          • {formatMarketEndDate(endDate)}
        </Text>
      </View>
      <View>
        {percentPnl > 0 ? (
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Success}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict.market_details.won')}{' '}
            {formatPrice(currentValue, { maximumDecimals: 2 })}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Error}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict.market_details.lost')}{' '}
            {formatPrice(initialValue - currentValue, { maximumDecimals: 2 })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PredictPositionResolved;
