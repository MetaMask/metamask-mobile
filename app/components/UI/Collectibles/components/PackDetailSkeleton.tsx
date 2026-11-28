import React from 'react';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Skeleton } from '../../primitives/Skeleton';
import { View } from '../../primitives/View';
import { CardListItemSkeleton } from './CardListItem';

const statKeys = ['s1', 's2', 's3'];
const cardKeys = ['c1', 'c2', 'c3'];
const rowKeys = ['r1', 'r2', 'r3'];

export function PackDetailSkeleton() {
  return (
    <View
      className="gap-6 px-4 pt-2"
      testID={collectiblesTestIds.packDetailSkeleton}
    >
      <View className="items-center gap-3">
        <Skeleton className="h-80 w-56 rounded-xl" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
        <View className="w-full flex-row gap-4">
          {statKeys.map((key) => (
            <Skeleton key={key} className="h-12 flex-1" />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <Skeleton className="h-6 w-32" />
        <View className="flex-row gap-4 overflow-hidden">
          {cardKeys.map((key) => (
            <CardListItemSkeleton key={key} className="w-36" />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <Skeleton className="h-6 w-48" />
        {rowKeys.map((key) => (
          <Skeleton key={key} className="h-8 w-full" />
        ))}
      </View>
    </View>
  );
}
