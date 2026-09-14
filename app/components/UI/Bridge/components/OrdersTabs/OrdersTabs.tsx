import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  AvatarBaseShape,
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { RootState } from '../../../../../reducers';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  selectAllowedChainRanking,
  selectOrdersNetworkFilter,
} from '../../../../../core/redux/slices/bridge';
import { OrdersEmptyState } from './OrdersEmptyState';
import { OrdersTabsSelectorsIDs } from './OrdersTabs.testIds';
import { OrdersTabKey, type OrdersTabsProps } from './OrdersTabs.types';

function itemMatchesNetworkFilter<T>(
  item: T,
  selectedChainId: CaipChainId | undefined,
  getItemChainId?: (item: T) => Hex | CaipChainId | undefined,
): boolean {
  if (!selectedChainId || !getItemChainId) {
    return true;
  }

  const itemChainId = getItemChainId(item);
  return (
    itemChainId !== undefined &&
    formatChainIdToCaip(itemChainId) === selectedChainId
  );
}

function OrdersNetworkFilter({
  enabledChainIds,
}: {
  enabledChainIds?: CaipChainId[];
}) {
  const navigation = useNavigation<AppNavigationProp>();
  const selectedChainId = useSelector(selectOrdersNetworkFilter);
  const chainRanking = useSelector((state: RootState) =>
    selectAllowedChainRanking(state, enabledChainIds),
  );

  const selectedNetwork = selectedChainId
    ? chainRanking.find((chain) => chain.chainId === selectedChainId)
    : undefined;
  const filterLabel = selectedNetwork?.name ?? strings('bridge.all_networks');

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
      params: { enabledChainIds, filterTarget: 'orders' },
    });
  }, [enabledChainIds, navigation]);

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      endIconName={IconName.ArrowDown}
      contentWrapperProps={{ twClassName: 'items-center' }}
      onPress={handlePress}
      testID={OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON}
    >
      {selectedChainId ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <AvatarNetwork
            src={getNetworkImageSource({ chainId: selectedChainId })}
            size={AvatarNetworkSize.Xs}
            name={filterLabel}
            shape={AvatarBaseShape.Square}
            twClassName="rounded"
            testID={OrdersTabsSelectorsIDs.NETWORK_FILTER_AVATAR}
          />
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {filterLabel}
          </Text>
        </Box>
      ) : (
        filterLabel
      )}
    </Button>
  );
}

function OrdersTabPanel<T>({
  items,
  renderItem,
  keyExtractor,
  getItemChainId,
  emptyDescription,
}: {
  items: T[];
  renderItem?: (item: T, index: number) => React.ReactElement;
  keyExtractor?: (item: T, index: number) => string;
  getItemChainId?: (item: T) => Hex | CaipChainId | undefined;
  emptyDescription: string;
}) {
  const selectedChainId = useSelector(selectOrdersNetworkFilter);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        itemMatchesNetworkFilter(item, selectedChainId, getItemChainId),
      ),
    [getItemChainId, items, selectedChainId],
  );

  if (filteredItems.length === 0 || !renderItem) {
    return <OrdersEmptyState description={emptyDescription} />;
  }

  // Map rows instead of FlashList so the parent page ScrollView owns
  // scrolling. A nested virtualized list with flex-1 fills the viewport
  // and captures pans, which blocks page scroll on short form screens.
  return (
    <Box testID={OrdersTabsSelectorsIDs.CONTENT} gap={2}>
      {filteredItems.map((item, index) => (
        <React.Fragment
          key={keyExtractor ? keyExtractor(item, index) : String(index)}
        >
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
  enabledChainIds,
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
    <Box testID={OrdersTabsSelectorsIDs.CONTAINER} twClassName="grow">
      <Box gap={2}>
        <Box twClassName="mx-4 border-t-[1px] border-muted" />
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
      </Box>
      <Box twClassName="mx-4 grow gap-4 py-4">
        <OrdersNetworkFilter enabledChainIds={enabledChainIds} />
        {selectedTab === OrdersTabKey.OpenOrders ? (
          <OrdersTabPanel
            items={openOrders.items}
            renderItem={openOrders.renderItem}
            keyExtractor={openOrders.keyExtractor}
            getItemChainId={openOrders.getItemChainId}
            emptyDescription={strings('bridge.orders.empty.open_orders')}
          />
        ) : (
          <OrdersTabPanel
            items={history.items}
            renderItem={history.renderItem}
            keyExtractor={history.keyExtractor}
            getItemChainId={history.getItemChainId}
            emptyDescription={strings('bridge.orders.empty.history')}
          />
        )}
      </Box>
    </Box>
  );
}

export default OrdersTabs;
