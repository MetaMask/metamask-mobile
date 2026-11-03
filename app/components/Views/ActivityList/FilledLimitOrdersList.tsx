import React, { forwardRef, useMemo } from 'react';
import {
  FlashList,
  type FlashListProps,
  type FlashListRef,
} from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import ActivityListDateHeader from '../../UI/ActivityListItemRow/ActivityListDateHeader';
import { LimitOrderTabRow } from '../../UI/Bridge/components/LimitOrderTabRow';
import { groupOrdersByDate } from '../../UI/Bridge/components/OrdersTabs/groupOrdersByDate';
import type { LimitOrder } from '../../UI/Bridge/api/limitOrders/getLimitOrders/types';
import { getHistoryLimitOrderDate } from '../../UI/Bridge/utils/limitOrders/createLimitOrdersTab';
import {
  ActivityListSelectorsIDs,
  activityListLimitOrderRowTestId,
} from './ActivityList.testIds';

export type FilledLimitOrderListItem =
  | { type: 'date-header'; key: string; timestamp: number }
  | { type: 'order'; key: string; order: LimitOrder };

type FilledLimitOrdersFlashListProps =
  FlashListProps<FilledLimitOrderListItem> & {
    ref?: React.Ref<FlashListRef<FilledLimitOrderListItem>>;
  };
const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<FilledLimitOrdersFlashListProps>,
) as unknown as React.ComponentType<FilledLimitOrdersFlashListProps>;

/**
 * Flattens orders into rows grouped by the day they closed, newest first,
 * each day led by a date header.
 *
 * @param orders - Filled limit orders.
 * @returns The list rows.
 */
export function buildFilledLimitOrderListItems(
  orders: LimitOrder[],
): FilledLimitOrderListItem[] {
  return groupOrdersByDate(orders, getHistoryLimitOrderDate).flatMap(
    (section) => {
      const rows: FilledLimitOrderListItem[] = section.items.map(
        ({ item }) => ({ type: 'order', key: item.id, order: item }),
      );
      const sectionDate = getHistoryLimitOrderDate(section.items[0].item);
      if (section.title === undefined || !sectionDate) {
        return rows;
      }
      return [
        {
          type: 'date-header',
          key: `date-${section.key}`,
          timestamp: new Date(sectionDate).getTime(),
        },
        ...rows,
      ];
    },
  );
}

const keyExtractor = (item: FilledLimitOrderListItem) => item.key;
const getItemType = (item: FilledLimitOrderListItem) => item.type;

const renderItem = ({ item }: { item: FilledLimitOrderListItem }) => {
  if (item.type === 'date-header') {
    return <ActivityListDateHeader timestamp={item.timestamp} />;
  }

  return (
    <Box
      twClassName="px-4 py-2"
      testID={activityListLimitOrderRowTestId(item.order.id)}
    >
      <LimitOrderTabRow order={item.order} />
    </Box>
  );
};

type FilledLimitOrdersListProps = Pick<
  FlashListProps<FilledLimitOrderListItem>,
  | 'ListHeaderComponent'
  | 'ListEmptyComponent'
  | 'ListFooterComponent'
  | 'refreshControl'
  | 'onScroll'
  | 'onEndReached'
  | 'contentContainerStyle'
  | 'style'
> & {
  /** Pass none while loading so the empty component shows the spinner. */
  orders: LimitOrder[];
};

/**
 * Activity list body for the Limit orders filter: filled swap limit orders,
 * rendered with the same rows as the Bridge order history.
 */
export const FilledLimitOrdersList = forwardRef<
  FlashListRef<FilledLimitOrderListItem>,
  FilledLimitOrdersListProps
>(({ orders, ...listProps }, ref) => {
  const items = useMemo(() => buildFilledLimitOrderListItems(orders), [orders]);

  return (
    <AnimatedFlashList
      {...listProps}
      ref={ref}
      testID={ActivityListSelectorsIDs.LIMIT_ORDERS_CONTAINER}
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemType={getItemType}
      onEndReachedThreshold={0.5}
      scrollEventThrottle={16}
    />
  );
});

FilledLimitOrdersList.displayName = 'FilledLimitOrdersList';
