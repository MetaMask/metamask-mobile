import React, { useCallback } from 'react';
import { TouchableOpacity, Image, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as ComponentTextVariant,
  TextColor as ComponentTextColor,
} from '../../../../../../component-library/components/Texts/Text/Text.types';
import {
  formatPercentage,
  formatPrice,
} from '../../../../../UI/Predict/utils/format';
import type { PredictPosition } from '../../../../../UI/Predict/types';
import { strings } from '../../../../../../../locales/i18n';

interface PredictPositionRowProps {
  position: PredictPosition;
  onPress: (position: PredictPosition) => void;
  privacyMode: boolean;
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
  privacyMode,
}: PredictPositionRowProps) => {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress(position);
  }, [onPress, position]);

  const { title, outcome, initialValue, size, currentValue, percentPnl } =
    position;

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title} - ${outcome}`}
      style={tw.style('flex-row items-start px-4 py-3 gap-4')}
    >
      {position.icon ? (
        <Image
          source={{ uri: position.icon }}
          style={tw.style('w-10 h-10 rounded-lg mt-1')}
        />
      ) : (
        <Box twClassName="w-10 h-10 rounded-lg mt-1 bg-background-alternative" />
      )}
      <Box style={tw.style('flex-1')} gap={0}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {title}
        </Text>
        <SensitiveText
          variant={ComponentTextVariant.BodySMMedium}
          color={ComponentTextColor.Alternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Long}
          numberOfLines={1}
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
      </Box>
      <Box twClassName="items-end" gap={0}>
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
            percentPnl >= 0
              ? ComponentTextColor.Success
              : ComponentTextColor.Error
          }
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
        >
          {formatPercentage(percentPnl)}
        </SensitiveText>
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
