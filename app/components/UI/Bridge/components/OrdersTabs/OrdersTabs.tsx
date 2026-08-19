import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { FlashList } from '@shopify/flash-list';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  selectTokenSelectorNetworkFilter,
} from '../../../../../core/redux/slices/bridge';
import { OrdersEmptyState } from './OrdersEmptyState';
import { OrdersTabsSelectorsIDs } from './OrdersTabs.testIds';
import { OrdersTabKey, type OrdersTabsProps } from './OrdersTabs.types';

function OrdersRowSeparator() {
  return <Box twClassName="h-2" />;
}

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
  const selectedChainId = useSelector(selectTokenSelectorNetworkFilter);
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
      params: { enabledChainIds },
    });
  }, [enabledChainIds, navigation]);

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      endIconName={IconName.ArrowDown}
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
            twClassName="rounded translate-y-px"
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
  const tw = useTailwind();
  const selectedChainId = useSelector(selectTokenSelectorNetworkFilter);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        itemMatchesNetworkFilter(item, selectedChainId, getItemChainId),
      ),
    [getItemChainId, items, selectedChainId],
  );

  const listRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) =>
      renderItem ? renderItem(item, index) : null,
    [renderItem],
  );

  const listKeyExtractor = useCallback(
    (item: T, index: number) =>
      keyExtractor ? keyExtractor(item, index) : String(index),
    [keyExtractor],
  );

  const listStyle = useMemo(() => tw.style('flex-1'), [tw]);

  if (filteredItems.length === 0 || !renderItem) {
    return <OrdersEmptyState description={emptyDescription} />;
  }

  return (
    <FlashList
      testID={OrdersTabsSelectorsIDs.CONTENT}
      data={filteredItems}
      renderItem={listRenderItem}
      keyExtractor={listKeyExtractor}
      ItemSeparatorComponent={OrdersRowSeparator}
      showsVerticalScrollIndicator={false}
      style={listStyle}
    />
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
      <Box twClassName="mx-4 flex-1 gap-4 py-4">
        {selectedTab === OrdersTabKey.OpenOrders ? (
          <>
            <OrdersNetworkFilter enabledChainIds={enabledChainIds} />
            <OrdersTabPanel
              items={openOrders.items}
              renderItem={openOrders.renderItem}
              keyExtractor={openOrders.keyExtractor}
              getItemChainId={openOrders.getItemChainId}
              emptyDescription={strings('bridge.orders.empty.open_orders')}
            />
          </>
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
