import React from 'react';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Skeleton } from '../../primitives/Skeleton';
import { View } from '../../primitives/View';

const tileKeys = ['t1', 't2', 't3', 't4'];

export function CollectionSkeleton() {
  return (
    <View
      className="gap-4 pt-4"
      testID={collectiblesTestIds.collectionSkeleton}
    >
      <View className="gap-2 px-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-2 h-12 w-full rounded-xl" />
      </View>
      <View className="flex-row flex-wrap px-2">
        {tileKeys.map((key) => (
          <View key={key} className="w-1/2 gap-2 px-2 pb-6">
            <Skeleton className="h-60 w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </View>
        ))}
      </View>
    </View>
  );
}
