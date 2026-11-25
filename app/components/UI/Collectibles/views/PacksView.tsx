import React from 'react';
import { View } from '../../primitives/View';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function PacksView() {
  return <View className="flex-1" testID={collectiblesTestIds.packsView} />;
}
