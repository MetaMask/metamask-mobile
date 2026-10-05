import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../util/theme';
import type { PredictPosition } from '../../../../../UI/Predict/types';
import PredictPositionItem from '../../../../../UI/Predict/components/PredictPosition';

interface PredictPositionRowProps {
  position: PredictPosition;
  onPress: (position: PredictPosition) => void;
  privacyMode: boolean;
}

const PredictPositionRowBase = ({
  position,
  onPress,
  privacyMode,
}: PredictPositionRowProps) => (
  <Box twClassName="px-4 py-1">
    <PredictPositionItem
      position={position}
      onPress={onPress}
      privacyMode={privacyMode}
      testID={`predict-position-row-${position.id}`}
    />
  </Box>
);

export const PredictPositionRow = React.memo(PredictPositionRowBase);

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
