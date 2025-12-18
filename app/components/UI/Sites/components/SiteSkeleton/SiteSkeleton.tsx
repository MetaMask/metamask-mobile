import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconSkeleton: {
    borderRadius: 20,
    marginBottom: 0,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 16,
  },
  nameSkeleton: {
    marginBottom: 8,
  },
  urlSkeleton: {
    marginBottom: 0,
  },
});

const SiteSkeleton = () => (
  <View style={styles.container}>
    {/* Logo skeleton */}
    <Skeleton height={40} width={40} style={styles.iconSkeleton} />

    {/* Content skeleton */}
    <View style={styles.contentContainer}>
      <Skeleton height={20} width="60%" style={styles.nameSkeleton} />
      <Skeleton height={16} width="40%" style={styles.urlSkeleton} />
    </View>
  </View>
);

export default SiteSkeleton;
