import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { isEqual } from 'lodash';
import type { CaipChainId } from '@metamask/utils';
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
  IconSize,
  IconName,
  Spinner,
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
import {
  OrdersTabKey,
  type OrdersTabConfig,
  type OrdersTabsProps,
} from './OrdersTabs.types';

/**
 * Networks the orders filter offers for one tab, re-derived as pages load.
 * Consumers fetch per selected network, so while one is selected the items
 * only cover that network; the networks seen under All networks are kept so
 * the picker still lists them.
 */
function useOrdersTabFilterChainIds<T>(
  { items, getItemChainId, isLoading }: OrdersTabConfig<T>,
  selectedChainId: CaipChainId | undefined,
  enabledChainIds: CaipChainId[] | undefined,
): CaipChainId[] {
  const itemChainIds = useMemo(() => {
    const chainIds = [...new Set(items.map(getItemChainId))];
    return enabledChainIds
      ? chainIds.filter((chainId) => enabledChainIds.includes(chainId))
      : chainIds;
  }, [enabledChainIds, getItemChainId, items]);

  const [allNetworksChainIds, setAllNetworksChainIds] = useState<CaipChainId[]>(
    [],
  );
  const isAllNetworksLoaded =
    !selectedChainId && !(isLoading && items.length === 0);

  if (isAllNetworksLoaded && !isEqual(allNetworksChainIds, itemChainIds)) {
    setAllNetworksChainIds(itemChainIds);
  }

  return useMemo(() => {
    if (!selectedChainId) {
      return isAllNetworksLoaded ? itemChainIds : allNetworksChainIds;
    }
    return [
      ...new Set([...allNetworksChainIds, ...itemChainIds, selectedChainId]),
    ];
  }, [allNetworksChainIds, isAllNetworksLoaded, itemChainIds, selectedChainId]);
}

function OrdersNetworkFilter({ chainIds }: { chainIds: CaipChainId[] }) {
  const navigation = useNavigation<AppNavigationProp>();
  const selectedChainId = useSelector(selectOrdersNetworkFilter);
  const chainRanking = useSelector((state: RootState) =>
    selectAllowedChainRanking(state, chainIds),
  );

  const selectedNetwork = selectedChainId
    ? chainRanking.find((chain) => chain.chainId === selectedChainId)
    : undefined;
  const filterLabel = selectedNetwork?.name ?? strings('bridge.all_networks');

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
      params: { enabledChainIds: chainIds, filterTarget: 'orders' },
    });
  }, [chainIds, navigation]);

  // A selected network keeps the button so the user can go back to All networks.
  if (!selectedChainId && chainRanking.length < 2) {
    return null;
  }

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
  isLoading,
  isError,
  isFetchingNextPage,
  onRetry,
}: {
  items: T[];
  renderItem?: (item: T, index: number) => React.ReactElement;
  keyExtractor?: (item: T, index: number) => string;
  getItemChainId: (item: T) => CaipChainId;
  emptyDescription: string;
  isLoading?: boolean;
  isError?: boolean;
  isFetchingNextPage?: boolean;
  onRetry?: () => void;
}) {
  const selectedChainId = useSelector(selectOrdersNetworkFilter);

  const filteredItems = useMemo(
    () =>
      selectedChainId
        ? items.filter((item) => getItemChainId(item) === selectedChainId)
        : items,
    [getItemChainId, items, selectedChainId],
  );

  if (isLoading && filteredItems.length === 0) {
    return (
      <Box alignItems={BoxAlignItems.Center} paddingVertical={6}>
        <Spinner
          testID={OrdersTabsSelectorsIDs.LOADING}
          spinnerIconProps={{ size: IconSize.Lg }}
        />
      </Box>
    );
  }

  if (isError && filteredItems.length === 0) {
    return (
      <OrdersEmptyState
        description={strings('bridge.orders.error')}
        actionButtonText={strings('bridge.orders.try_again')}
        onAction={onRetry}
        testID={OrdersTabsSelectorsIDs.ERROR_STATE}
        actionButtonTestID={OrdersTabsSelectorsIDs.RETRY_BUTTON}
      />
    );
  }

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
      {isFetchingNextPage ? (
        <Box alignItems={BoxAlignItems.Center} paddingVertical={4}>
          <Spinner
            testID={OrdersTabsSelectorsIDs.NEXT_PAGE_LOADING}
            spinnerIconProps={{ size: IconSize.Md }}
          />
        </Box>
      ) : null}
    </Box>
  );
}

function OrdersTabs<TOpen, THistory>({
  openOrders,
  history,
  initialTab = OrdersTabKey.OpenOrders,
  activeTab,
  enabledChainIds,
  onTabChange,
}: OrdersTabsProps<TOpen, THistory>) {
  const [internalSelectedTab, setInternalSelectedTab] =
    useState<OrdersTabKey>(initialTab);
  const selectedTab = activeTab ?? internalSelectedTab;
  const selectedChainId = useSelector(selectOrdersNetworkFilter);
  const openOrdersChainIds = useOrdersTabFilterChainIds(
    openOrders,
    selectedChainId,
    enabledChainIds,
  );
  const historyChainIds = useOrdersTabFilterChainIds(
    history,
    selectedChainId,
    enabledChainIds,
  );

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
        <Box twClassName="border-t-[1px] border-muted" />
        <TabsBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={(index) => {
            const nextTab =
              index === 1 ? OrdersTabKey.History : OrdersTabKey.OpenOrders;
            if (activeTab === undefined) {
              setInternalSelectedTab(nextTab);
            }
            onTabChange?.(nextTab);
          }}
          testID={OrdersTabsSelectorsIDs.TABS_BAR}
        />
      </Box>
      <Box twClassName="mx-4 grow gap-4 py-4">
        <OrdersNetworkFilter
          chainIds={
            selectedTab === OrdersTabKey.History
              ? historyChainIds
              : openOrdersChainIds
          }
        />
        {selectedTab === OrdersTabKey.OpenOrders ? (
          <OrdersTabPanel
            items={openOrders.items}
            renderItem={openOrders.renderItem}
            keyExtractor={openOrders.keyExtractor}
            getItemChainId={openOrders.getItemChainId}
            isLoading={openOrders.isLoading}
            isError={openOrders.isError}
            isFetchingNextPage={openOrders.isFetchingNextPage}
            onRetry={openOrders.onRetry}
            emptyDescription={strings('bridge.orders.empty.open_orders')}
          />
        ) : (
          <OrdersTabPanel
            items={history.items}
            renderItem={history.renderItem}
            keyExtractor={history.keyExtractor}
            getItemChainId={history.getItemChainId}
            isLoading={history.isLoading}
            isError={history.isError}
            isFetchingNextPage={history.isFetchingNextPage}
            onRetry={history.onRetry}
            emptyDescription={strings('bridge.orders.empty.history')}
          />
        )}
      </Box>
    </Box>
  );
}

export default OrdersTabs;
