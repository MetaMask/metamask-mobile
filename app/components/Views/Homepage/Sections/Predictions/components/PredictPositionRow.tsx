import React, { useCallback } from 'react';
import { TouchableOpacity, Image, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import {
  formatPercentage,
  formatPrice,
} from '../../../../../UI/Predict/utils/format';
import type { PredictPosition } from '../../../../../UI/Predict/types';

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
 * Skeleton for a position row with shimmer effect (matches row layout)
 */
export const PredictPositionRowSkeleton = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <View style={tw.style('px-4 py-3')}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={tw.style('flex-row items-center gap-4')}>
          <View style={tw.style('w-10 h-10 rounded-lg')} />
          <View style={tw.style('flex-1 gap-1')}>
            <View style={tw.style('w-[140px] h-4 rounded')} />
            <View style={tw.style('w-[180px] h-4 rounded')} />
          </View>
          <View style={tw.style('items-end gap-1')}>
            <View style={tw.style('w-[60px] h-4 rounded')} />
            <View style={tw.style('w-[45px] h-4 rounded')} />
          </View>
        </View>
      </SkeletonPlaceholder>
    </View>
  );
};

export default PredictPositionRow;
