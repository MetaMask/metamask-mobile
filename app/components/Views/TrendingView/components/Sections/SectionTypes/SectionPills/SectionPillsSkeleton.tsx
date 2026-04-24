import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import Skeleton from '../../../../../../../component-library/components/Skeleton/Skeleton';

const SKELETON_PILLS_PER_ROW = 6;
const SKELETON_PILL_WIDTH = 104;
const SKELETON_PILL_HEIGHT = 32;

const styles = StyleSheet.create({
  pill: {
    borderRadius: 9999,
  },
});

const SectionPillsSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box marginBottom={5} twClassName="bg-transparent">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('bg-transparent')}
        contentContainerStyle={tw.style('flex-col gap-2 pr-0')}
      >
        <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-nowrap gap-2"
          >
            {Array.from({ length: SKELETON_PILLS_PER_ROW }).map((_, i) => (
              <View
                key={`r1-${i}`}
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
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-nowrap gap-2"
          >
            {Array.from({ length: SKELETON_PILLS_PER_ROW }).map((_, i) => (
              <View
                key={`r2-${i}`}
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
        </Box>
      </ScrollView>
    </Box>
  );
};

export default SectionPillsSkeleton;
