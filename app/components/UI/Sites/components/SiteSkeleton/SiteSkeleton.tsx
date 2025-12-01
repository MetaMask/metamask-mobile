import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    paddingTop: 8,
    paddingBottom: 8,
  },
  iconSkeleton: {
    borderRadius: 100, // Fully circular
  },
  leftContainer: {
    paddingLeft: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  tokenHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tokenNameSkeleton: {
    marginBottom: 0,
  },
  marketStatsSkeleton: {
    marginTop: 2,
    marginBottom: 0,
  },
});

const iconSize = 40;
const SitesSkeleton: React.FC<ViewStyle> = () => (
  <View style={styles.container}>
    <View>
      <Skeleton
        height={iconSize}
        width={iconSize}
        style={styles.iconSkeleton}
      />
    </View>
    <View style={[styles.leftContainer, { minHeight: iconSize }]}>
      <View style={styles.tokenHeaderRow}>
        <Skeleton height={20} width="60%" style={styles.tokenNameSkeleton} />
      </View>
      <Skeleton height={18} width="80%" style={styles.marketStatsSkeleton} />
    </View>
  </View>
);

export default SitesSkeleton;
