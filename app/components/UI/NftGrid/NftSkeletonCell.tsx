import React from 'react';
import { StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../util/theme';

const styles = StyleSheet.create({
  cell: { flex: 1, marginBottom: 12 },
  image: { aspectRatio: 1, borderRadius: 12 },
  textName: { height: 14, borderRadius: 4, marginTop: 8, width: '70%' },
  textCollection: { height: 12, borderRadius: 4, marginTop: 4, width: '50%' },
});

interface NftSkeletonCellProps {
  // speed=0 skips Animated.loop, preventing Detox AnimatedModuleIdlingResource hangs in E2E
  animated?: boolean;
}

const NftSkeletonCell = ({ animated = true }: NftSkeletonCellProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.cell}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
        speed={animated ? 800 : 0}
      >
        <View style={styles.image} />
        <View style={styles.textName} />
        <View style={styles.textCollection} />
      </SkeletonPlaceholder>
    </View>
  );
};

export default NftSkeletonCell;
