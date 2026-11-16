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

const MarketSeparator = () => (
  <Box twClassName="h-[14px]" testID={MarketListTestIds.SEPARATOR} />
);

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
  /** Whether two adjacent rows get the 14px gap; every pair by default. */
  isSeparated?: (leadingItem: T, trailingItem: T) => boolean;
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
  isSeparated,
}: MarketListProps<T>) => {
  const tw = useTailwind();
  const listContentContainerStyle = useMemo(
    () => [tw.style('flex-grow pb-8'), contentContainerStyle],
    [contentContainerStyle, tw],
  );
  // FlatList passes a separator only the row above it, so look up the next.
  const ItemSeparator = useMemo(() => {
    if (!isSeparated) return MarketSeparator;
    const nextItems = new Map(
      data.slice(0, -1).map((item, index) => [item, data[index + 1]]),
    );
    return ({ leadingItem }: { leadingItem: T }) => {
      const trailingItem = nextItems.get(leadingItem);
      return trailingItem === undefined ||
        isSeparated(leadingItem, trailingItem) ? (
        <MarketSeparator />
      ) : null;
    };
  }, [data, isSeparated]);
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
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={listContentContainerStyle}
      showsVerticalScrollIndicator={false}
    />
  );
};
