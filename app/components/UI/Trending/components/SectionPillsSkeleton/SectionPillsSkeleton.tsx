import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';

const SKELETON_PILLS_PER_ROW = 6;
const SKELETON_PILL_WIDTH = 104;
const SKELETON_PILL_HEIGHT = 32;

const styles = StyleSheet.create({
  pill: { borderRadius: 9999 },
});

const SkeletonRow: React.FC<{ prefix: string }> = ({ prefix }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="flex-nowrap gap-2"
  >
    {Array.from({ length: SKELETON_PILLS_PER_ROW }).map((_, i) => (
      <View
        key={`${prefix}-${i}`}
        style={styles.pill}
        testID="section-pills-skeleton-pill"
      >
        <Skeleton
          width={SKELETON_PILL_WIDTH}
          height={SKELETON_PILL_HEIGHT}
          testID="section-pills-skeleton"
        />
      </View>
    ))}
  </Box>
);

interface SectionPillsSkeletonProps {
  rowCount?: number;
}

const SectionPillsSkeleton: React.FC<SectionPillsSkeletonProps> = ({
  rowCount = 2,
}) => {
  const tw = useTailwind();
  const normalizedRowCount = Math.max(1, Math.floor(rowCount));

  return (
    <Box marginBottom={5} twClassName="bg-transparent">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('bg-transparent')}
        contentContainerStyle={tw.style('flex-col gap-2 pr-0')}
      >
        <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
          {Array.from({ length: normalizedRowCount }).map((_, rowIndex) => (
            <SkeletonRow key={rowIndex} prefix={`r${rowIndex}`} />
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default SectionPillsSkeleton;
