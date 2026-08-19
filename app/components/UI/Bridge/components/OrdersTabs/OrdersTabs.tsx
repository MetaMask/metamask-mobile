import React, { useMemo, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import { OrdersEmptyState } from './OrdersEmptyState';
import { OrdersTabsSelectorsIDs } from './OrdersTabs.testIds';
import { OrdersTabKey, type OrdersTabsProps } from './OrdersTabs.types';

function OrdersTabPanel<T>({
  items,
  renderItem,
  keyExtractor,
  emptyDescription,
}: {
  items: T[];
  renderItem?: (item: T, index: number) => React.ReactElement;
  keyExtractor?: (item: T, index: number) => string;
  emptyDescription: string;
}) {
  if (items.length === 0 || !renderItem) {
    return <OrdersEmptyState description={emptyDescription} />;
  }

  return (
    <Box testID={OrdersTabsSelectorsIDs.CONTENT} twClassName="flex-1">
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor?.(item, index) ?? String(index)}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </Box>
  );
}

function OrdersTabs<TOpen, THistory>({
  openOrders,
  history,
  initialTab = OrdersTabKey.OpenOrders,
}: OrdersTabsProps<TOpen, THistory>) {
  const [selectedTab, setSelectedTab] = useState<OrdersTabKey>(initialTab);

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: OrdersTabKey.OpenOrders,
        label: strings('bridge.orders.tabs.open_orders'),
        content: null,
        testID: OrdersTabsSelectorsIDs.OPEN_ORDERS_TAB,
      },
      {
        key: OrdersTabKey.History,
        label: strings('bridge.orders.tabs.history'),
        content: null,
        testID: OrdersTabsSelectorsIDs.HISTORY_TAB,
      },
    ],
    [],
  );

  const activeIndex = selectedTab === OrdersTabKey.History ? 1 : 0;

  return (
    <Box testID={OrdersTabsSelectorsIDs.CONTAINER} twClassName="flex-1">
      <Box twClassName="mx-4 h-px bg-border-muted" />
      <TabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={(index) =>
          setSelectedTab(
            index === 1 ? OrdersTabKey.History : OrdersTabKey.OpenOrders,
          )
        }
        testID={OrdersTabsSelectorsIDs.TABS_BAR}
      />
      {selectedTab === OrdersTabKey.OpenOrders ? (
        <OrdersTabPanel
          items={openOrders.items}
          renderItem={openOrders.renderItem}
          keyExtractor={openOrders.keyExtractor}
          emptyDescription={strings('bridge.orders.empty.open_orders')}
        />
      ) : (
        <OrdersTabPanel
          items={history.items}
          renderItem={history.renderItem}
          keyExtractor={history.keyExtractor}
          emptyDescription={strings('bridge.orders.empty.history')}
        />
      )}
    </Box>
  );
}

export default OrdersTabs;
