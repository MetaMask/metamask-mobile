import React, { useCallback } from 'react';
import { TouchableOpacity, Image } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  formatPercentage,
  formatPrice,
} from '../../../../../UI/Predict/utils/format';
import type { PredictPosition } from '../../../../../UI/Predict/types';
import Skeleton from '../../../../../../component-library/components/Skeleton/Skeleton';

interface PredictPositionRowProps {
  position: PredictPosition;
  onPress: (position: PredictPosition) => void;
}

/**
 * Compact position row for homepage display
 * Layout: Image | Title + Direction | value + PnL%
 *
 * Line 1: Title (e.g., "Gavin Newsom" or "Will ETF be approved?")
 * Line 2: Direction (e.g., "Yes" or "No")
 */
export const PredictPositionRow = ({
  position,
  onPress,
}: PredictPositionRowProps) => {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress(position);
  }, [onPress, position]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${position.title} - ${position.outcome}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        paddingHorizontal={4}
        paddingVertical={3}
        gap={4}
      >
        <Image
          source={{ uri: position.icon }}
          style={tw.style('w-10 h-10 rounded-lg mt-1')}
        />
        <Box style={tw.style('flex-1')} gap={0}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {position.title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {formatPrice(position.initialValue, { maximumDecimals: 2 })} on{' '}
            {position.outcome} to win{' '}
            {formatPrice(position.size, { maximumDecimals: 2 })}
          </Text>
        </Box>
        <Box twClassName="items-end" gap={0}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {formatPrice(position.currentValue, { maximumDecimals: 2 })}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={
              position.percentPnl >= 0
                ? TextColor.SuccessDefault
                : TextColor.ErrorDefault
            }
          >
            {formatPercentage(position.percentPnl)}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

/**
 * Skeleton for a position row (no background, matches row layout)
 */
export const PredictPositionRowSkeleton = () => {
  const tw = useTailwind();
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={4}
      paddingVertical={3}
      gap={4}
    >
      <Skeleton width={40} height={40} style={tw.style('rounded-lg')} />
      <Box style={tw.style('flex-1')} gap={1}>
        <Skeleton width={140} height={16} style={tw.style('rounded')} />
        <Skeleton width={180} height={16} style={tw.style('rounded')} />
      </Box>
      <Box twClassName="items-end" gap={1}>
        <Skeleton width={60} height={16} style={tw.style('rounded')} />
        <Skeleton width={45} height={16} style={tw.style('rounded')} />
      </Box>
    </Box>
  );
};

export default PredictPositionRow;
