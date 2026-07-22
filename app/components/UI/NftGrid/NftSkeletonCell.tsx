import React from 'react';
import { StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../util/theme';

const styles = StyleSheet.create({
  // Matches NftGridItem root: flex-1 + mb-3 (12px)
  cell: { flex: 1, marginBottom: 12 },
  // Square image area
  image: { aspectRatio: 1, borderRadius: 12 },
  // Name text placeholder — matches BodyMd + mt-2
  textName: { height: 14, borderRadius: 4, marginTop: 8, width: '70%' },
  // Collection text placeholder — matches BodySm
  textCollection: { height: 12, borderRadius: 4, marginTop: 4, width: '50%' },
});

/**
 * A single skeleton cell that matches NftGridItem dimensions.
 * Used in the full NFTs view to fill empty grid slots while detection is in progress.
 */
const NftSkeletonCell = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.cell}>
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <View style={styles.image} />
        <View style={styles.textName} />
        <View style={styles.textCollection} />
      </SkeletonPlaceholder>
    </View>
  );
};

export default NftSkeletonCell;
