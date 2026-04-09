import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useStyles } from '../../../../../component-library/hooks';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as ComponentTextVariant,
  TextColor as ComponentTextColor,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import { PredictPosition as PredictPositionType } from '../../types';
import { formatPrice } from '../../utils/format';
import styleSheet from './PredictPositionResolved.styles';
import { PredictPositionSelectorsIDs } from '../../Predict.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

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
  privacyMode: boolean;
}

const PredictPositionResolved: React.FC<PredictPositionResolvedProps> = ({
  position,
  onPress,
  privacyMode,
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
  const tw = useTailwind();

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
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          style={tw.style('font-medium')}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <SensitiveText
          variant={ComponentTextVariant.BodySMMedium}
          color={ComponentTextColor.Alternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Long}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {strings('predict.market_details.amount_on_outcome', {
            amount: formatPrice(initialValue, { maximumDecimals: 2 }),
            outcome,
          })}{' '}
          • {formatMarketEndDate(endDate)}
        </SensitiveText>
      </View>
      <View>
        {percentPnl > 0 ? (
          <SensitiveText
            variant={ComponentTextVariant.BodyMDMedium}
            color={ComponentTextColor.Success}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict.market_details.won')}{' '}
            {formatPrice(currentValue, { maximumDecimals: 2 })}
          </SensitiveText>
        ) : (
          <SensitiveText
            variant={ComponentTextVariant.BodyMDMedium}
            color={ComponentTextColor.Error}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict.market_details.lost')}{' '}
            {formatPrice(initialValue - currentValue, { maximumDecimals: 2 })}
          </SensitiveText>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PredictPositionResolved;
