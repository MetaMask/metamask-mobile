import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  type ListRenderItemInfo,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PredictMarket } from '../../types';
import { MarketListTestIds } from './MarketList.testIds';

const MarketSeparator = () => <Box twClassName="h-[14px]" />;

const getMarketKey = (market: PredictMarket) => market.id;

export interface MarketListProps {
  markets: readonly PredictMarket[];
  renderItem: (market: PredictMarket) => React.ReactElement | null;
  ListHeaderComponent?: React.ReactElement | null;
  testID?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const MarketList = ({
  markets,
  renderItem,
  ListHeaderComponent,
  testID = MarketListTestIds.ROOT,
  contentContainerStyle,
}: MarketListProps) => {
  const tw = useTailwind();
  const listContentContainerStyle = useMemo(
    () => [tw.style('flex-grow pb-8'), contentContainerStyle],
    [contentContainerStyle, tw],
  );
  const handleRenderItem = useCallback(
    ({ item }: ListRenderItemInfo<PredictMarket>) => renderItem(item),
    [renderItem],
  );

  return (
    <FlatList
      testID={testID}
      style={tw.style('flex-1')}
      data={markets}
      renderItem={handleRenderItem}
      keyExtractor={getMarketKey}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={MarketSeparator}
      contentContainerStyle={listContentContainerStyle}
      showsVerticalScrollIndicator={false}
    />
  );
};
