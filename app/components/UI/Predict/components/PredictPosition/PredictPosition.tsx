import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as ComponentTextVariant,
  TextColor as ComponentTextColor,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import { PredictPosition as PredictPositionType } from '../../types';
import { formatPercentage, formatPrice } from '../../utils/format';
import styleSheet from './PredictPosition.styles';
import { PredictPositionSelectorsIDs } from '../../Predict.testIds';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { usePredictOptimisticPositionRefresh } from '../../hooks/usePredictOptimisticPositionRefresh';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface PredictPositionProps {
  position: PredictPositionType;
  onPress?: (position: PredictPositionType) => void;
  privacyMode: boolean;
}

const PredictPosition: React.FC<PredictPositionProps> = ({
  position,
  onPress,
  privacyMode,
}: PredictPositionProps) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();

  const currentPosition = usePredictOptimisticPositionRefresh({
    position,
  });

  const {
    icon,
    title,
    initialValue,
    percentPnl,
    outcome,
    currentValue,
    size,
    optimistic,
  } = currentPosition;

  return (
    <TouchableOpacity
      testID={PredictPositionSelectorsIDs.CURRENT_POSITION_CARD}
      style={styles.positionContainer}
      onPress={() => onPress?.(currentPosition)}
    >
      <View style={styles.positionImageContainer}>
        <Image source={{ uri: icon }} style={styles.positionImage} />
      </View>
      <View style={styles.positionDetails}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          style={tw.style('font-medium')}
        >
          {title}
        </Text>
        <SensitiveText
          variant={ComponentTextVariant.BodySMMedium}
          color={ComponentTextColor.Alternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Long}
        >
          {strings('predict.position_info', {
            initialValue: formatPrice(initialValue, {
              maximumDecimals: 2,
            }),
            outcome,
            shares: formatPrice(size, {
              maximumDecimals: 2,
            }),
          })}
        </SensitiveText>
      </View>
      <View style={styles.positionPnl}>
        {optimistic ? (
          <>
            <Skeleton width={60} height={20} style={styles.skeletonSpacing} />
            <Skeleton width={50} height={16} />
          </>
        ) : (
          <>
            <SensitiveText
              variant={ComponentTextVariant.BodyMDMedium}
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
            >
              {formatPrice(currentValue, { maximumDecimals: 2 })}
            </SensitiveText>
            <SensitiveText
              variant={ComponentTextVariant.BodySMMedium}
              color={
                percentPnl > 0
                  ? ComponentTextColor.Success
                  : ComponentTextColor.Error
              }
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
            >
              {formatPercentage(percentPnl)}
            </SensitiveText>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PredictPosition;
