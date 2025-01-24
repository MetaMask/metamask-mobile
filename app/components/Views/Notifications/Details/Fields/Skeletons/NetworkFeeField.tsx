import React from 'react';
import { DimensionValue, Dimensions } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonPlaceholderItem {
  width: DimensionValue;
  height: DimensionValue;
  borderRadius: number;
  marginTop: number;
}


export default function NetworkFeeFieldSkeleton() {

  const skeletonProps: SkeletonPlaceholderItem = {
    width: 32,
    height: 45,
    borderRadius: 6,
    marginTop: 8,
  };

  return (
    <SkeletonPlaceholder>
      <SkeletonPlaceholder.Item
        flexDirection="row"
        alignItems="center"
        gap={8}
      >
        <SkeletonPlaceholder.Item {...skeletonProps} />
        <SkeletonPlaceholder.Item {...skeletonProps} width={Dimensions.get('screen').width - 68} />
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  );
}
