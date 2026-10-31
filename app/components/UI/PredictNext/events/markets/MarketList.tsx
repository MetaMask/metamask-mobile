import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  type FlatListProps,
  type ListRenderItemInfo,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { MarketListTestIds } from './MarketList.testIds';

const MarketSeparator = () => <Box twClassName="h-[14px]" />;

export interface MarketListProps<T>
  extends Pick<
    FlatListProps<T>,
    'initialNumToRender' | 'maxToRenderPerBatch' | 'windowSize'
  > {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement | null;
  ListHeaderComponent?: React.ReactElement | null;
  extraData?: unknown;
  testID?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const MarketList = <T,>({
  data,
  keyExtractor,
  renderItem,
  ListHeaderComponent,
  extraData,
  testID = MarketListTestIds.ROOT,
  contentContainerStyle,
  initialNumToRender,
  maxToRenderPerBatch,
  windowSize,
}: MarketListProps<T>) => {
  const tw = useTailwind();
  const listContentContainerStyle = useMemo(
    () => [tw.style('flex-grow pb-8'), contentContainerStyle],
    [contentContainerStyle, tw],
  );
  const handleRenderItem = useCallback(
    ({ item }: ListRenderItemInfo<T>) => renderItem(item),
    [renderItem],
  );

  return (
    <FlatList
      testID={testID}
      style={tw.style('flex-1')}
      data={data as T[]}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      extraData={extraData}
      renderItem={handleRenderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={MarketSeparator}
      contentContainerStyle={listContentContainerStyle}
      showsVerticalScrollIndicator={false}
    />
  );
};
