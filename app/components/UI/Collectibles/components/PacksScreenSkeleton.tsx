import React from 'react';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Skeleton } from '../../primitives/Skeleton';
import { View } from '../../primitives/View';

const chipKeys = ['c1', 'c2', 'c3', 'c4'];
const tileKeys = ['t1', 't2', 't3', 't4'];

export function PacksScreenSkeleton() {
  return (
    <View className="gap-4" testID={collectiblesTestIds.packsSkeleton}>
      <View className="flex-row gap-2 overflow-hidden px-4">
        {chipKeys.map((key) => (
          <Skeleton key={key} className="h-8 w-20 rounded-full" />
        ))}
      </View>
      <View className="flex-row flex-wrap px-2.5">
        {tileKeys.map((key) => (
          <View key={key} className="w-1/2 gap-2 px-1.5 pb-6">
            <Skeleton className="h-60 w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-8 w-full rounded-full" />
          </View>
        ))}
      </View>
    </View>
  );
}
