import React from 'react';
import { Image } from 'react-native';
import { Box, ButtonBase } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { PredictPosition as PredictPositionType } from '../../types';
import {
  formatCents,
  formatPercentage,
  formatPositionSize,
  formatPrice,
} from '../../utils/format';
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
  const tw = useTailwind();

  return (
    <ButtonBase
      testID={PredictPositionSelectorsIDs.CURRENT_POSITION_CARD}
      onPress={() => onPress?.(position)}
      twClassName="flex-row items-start py-2 gap-4 w-full"
    >
      <Box twClassName="pt-1">
        <Image
          source={{ uri: icon }}
          style={tw.style('w-10 h-10 rounded-full')}
        />
      </Box>
      <Box twClassName="flex-1 gap-0.5">
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
      </Box>
      <Box twClassName="gap-2 items-end">
        {optimistic ? (
          <>
            <Skeleton width={60} height={20} style={tw.style('mb-1')} />
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
      </Box>
    </ButtonBase>
  );
};

export default PredictPosition;
