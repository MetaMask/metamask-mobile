import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  centerColumn: {
    flex: 1,
    gap: 6,
  },
  nameSkeleton: {
    height: 16,
    borderRadius: 8,
    width: '60%',
  },
  spenderSkeleton: {
    height: 12,
    borderRadius: 8,
    width: '40%',
  },
  rightColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  valueSkeleton: {
    height: 16,
    width: 60,
    borderRadius: 8,
  },
  buttonSkeleton: {
    height: 28,
    width: 64,
    borderRadius: 14,
  },
});

const SkeletonApprovalCard: React.FC = () => (
  <View style={styles.container}>
    <Skeleton style={styles.avatar} />
    <View style={styles.centerColumn}>
      <Skeleton style={styles.nameSkeleton} />
      <Skeleton style={styles.spenderSkeleton} />
    </View>
    <View style={styles.rightColumn}>
      <Skeleton style={styles.valueSkeleton} />
      <Skeleton style={styles.buttonSkeleton} />
    </View>
  </View>
);

export default SkeletonApprovalCard;
