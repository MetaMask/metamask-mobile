import React from 'react';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function CollectionView() {
  return (
    <View className="flex-1" testID={collectiblesTestIds.collectionView} />
  );
}
