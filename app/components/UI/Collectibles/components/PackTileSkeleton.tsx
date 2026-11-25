import React from 'react';
import { View } from '../../primitives/View';
import { Skeleton } from '../../primitives/Skeleton';

/** Loading placeholder with the same footprint as PackTile. */
export function PackTileSkeleton() {
  return (
    <View className="w-48 gap-2">
      <Skeleton className="h-[302px] w-full rounded-xl" />
      <View className="gap-1">
        <Skeleton className="h-6 w-11/12" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </View>
    </View>
  );
}
