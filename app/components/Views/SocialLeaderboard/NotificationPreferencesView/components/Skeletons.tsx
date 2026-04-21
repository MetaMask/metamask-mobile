import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SkeletonShell } from '../../TraderProfileView/components/Skeletons';

const SKELETON_ROW_COUNT = 3;

/**
 * Placeholder row that mirrors the layout of `TraderNotificationRow`:
 * avatar circle on the left, name bar beside it, toggle pill on the right.
 */
const TraderNotificationRowSkeleton: React.FC = () => {
  const tw = useTailwind();
  return (
    <SkeletonShell>
      <View style={tw.style('flex-row items-center')}>
        <View style={tw.style('w-10 h-10 rounded-full mr-3')} />
        <View style={tw.style('flex-1')}>
          <View style={tw.style('w-32 h-4 rounded')} />
        </View>
        <View style={tw.style('w-12 h-7 rounded-xl ml-3')} />
      </View>
    </SkeletonShell>
  );
};

/**
 * Renders `SKELETON_ROW_COUNT` shimmer rows to fill the "Traders you follow"
 * section while followed-trader data is loading.
 */
export const TradersFollowedSkeleton: React.FC = () => (
  <>
    {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
      <TraderNotificationRowSkeleton key={i} />
    ))}
  </>
);
