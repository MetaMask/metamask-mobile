import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { View, Modal } from 'react-native';
import {
  TabsList,
  TabsListRef,
} from '../../../../../component-library/components-temp/Tabs';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { captureException } from '@sentry/react-native';
import PerpsMarketStatisticsCard from '../PerpsMarketStatisticsCard';
import PerpsPositionCard from '../PerpsPositionCard';
import { PerpsMarketTabsProps, PerpsTabId } from './PerpsMarketTabs.types';
import styleSheet from './PerpsMarketTabs.styles';
import type {
  Position,
  Order,
  PerpsNavigationParamList,
} from '../../controllers/types';
import { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import {
  usePerpsLivePositions,
  usePerpsLiveOrders,
  usePerpsLivePrices,
} from '../../hooks/stream';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketTabsSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsOpenOrderCard from '../PerpsOpenOrderCard';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../../core/Engine';
import { getOrderDirection } from '../../utils/orderUtils';
import usePerpsToasts from '../../hooks/usePerpsToasts';
import { OrderDirection } from '../../types/perps-types';
import Routes from '../../../../../constants/navigation/Routes';

// Tab content component for Position tab
interface PositionTabContentProps {
  tabLabel: string;
  position: Position | null;
  showIcon: boolean;
  onAutoClosePress?: () => void;
  onMarginPress?: () => void;
  onSharePress?: () => void;
}

const PositionTabContent: React.FC<PositionTabContentProps> = ({
  position,
  showIcon,
  onAutoClosePress,
  onMarginPress,
  onSharePress,
}) => {
  const { styles } = useStyles(styleSheet, {});

  if (!position) return null;

  return (
    <View
      style={styles.tabContent}
      testID={PerpsMarketTabsSelectorsIDs.POSITION_CONTENT}
    >
      <PerpsPositionCard
        key={`${position.coin}`}
        position={position}
        showIcon={showIcon}
        onAutoClosePress={onAutoClosePress}
        onMarginPress={onMarginPress}
        onSharePress={onSharePress}
      />
    </View>
  );
};

// Tab content component for Orders tab
interface OrdersTabContentProps {
  tabLabel: string;
  sortedUnfilledOrders: Order[];
  activeTPOrderId: string | null | undefined;
  activeSLOrderId: string | null | undefined;
  cancellingOrderIds: Set<string>;
  onOrderCancel: (order: Order) => Promise<void>;
  onOrderSelect?: (orderId: string) => void;
}

const OrdersTabContent = React.memo<OrdersTabContentProps>(
  ({
    sortedUnfilledOrders,
    activeTPOrderId,
    activeSLOrderId,
    cancellingOrderIds,
    onOrderCancel,
    onOrderSelect,
  }) => {
    const { styles } = useStyles(styleSheet, {});

    return (
      <View
        style={styles.tabContent}
        testID={PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT}
      >
        {sortedUnfilledOrders.length === 0 ? (
          <View
            style={styles.emptyStateContainer}
            testID={PerpsMarketTabsSelectorsIDs.ORDERS_EMPTY_STATE}
          >
            <Icon
              name={IconName.Book}
              size={IconSize.Xl}
              color={TextColor.Muted}
              style={styles.emptyStateIcon}
              testID={PerpsMarketTabsSelectorsIDs.ORDERS_EMPTY_ICON}
            />
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.emptyStateText}
              testID={PerpsMarketTabsSelectorsIDs.ORDERS_EMPTY_TEXT}
            >
              {strings('perps.no_open_orders')}
            </Text>
          </View>
        ) : (
          <>
            {sortedUnfilledOrders.map((order) => {
              // Determine if this order is currently active on the chart
              const isActiveTP = activeTPOrderId === order.orderId;
              const isActiveSL = activeSLOrderId === order.orderId;
              const isActive = isActiveTP || isActiveSL;

              // Determine active type - if both TP and SL are from same order, show 'BOTH'
              let activeType: 'TP' | 'SL' | 'BOTH' | undefined;
              if (isActiveTP && isActiveSL) {
                activeType = 'BOTH';
              } else if (isActiveTP) {
                activeType = 'TP';
              } else if (isActiveSL) {
                activeType = 'SL';
              }

              return (
                <PerpsOpenOrderCard
                  key={order.orderId}
                  order={order}
                  expanded
                  showIcon
                  onCancel={onOrderCancel}
                  onSelect={onOrderSelect}
                  isActiveOnChart={isActive}
                  activeType={activeType}
                  isCancelling={cancellingOrderIds.has(order.orderId)}
                />
              );
            })}
          </>
        )}
      </View>
    );
  },
);

// Tab content component for Statistics tab
interface StatisticsTabContentProps {
  symbol: string;
  onTooltipPress: (contentKey: PerpsTooltipContentKey) => void;
  nextFundingTime?: number;
  fundingIntervalHours?: number;
  tabLabel?: string; // Used by TabsList parent, not by component itself
}

const StatisticsTabContent = React.memo<StatisticsTabContentProps>(
  ({ symbol, onTooltipPress, nextFundingTime, fundingIntervalHours }) => {
    const { styles } = useStyles(styleSheet, {});
    const marketStats = usePerpsMarketStats(symbol);

    return (
      <View
        style={styles.tabContent}
        testID={PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT}
      >
        <PerpsMarketStatisticsCard
          symbol={symbol}
          marketStats={marketStats}
          onTooltipPress={onTooltipPress}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />
      </View>
    );
  },
);

const PerpsMarketTabs: React.FC<PerpsMarketTabsProps> = ({
  symbol,
  onActiveTabChange,
  activeTabId: externalActiveTabId,
  initialTab,
  nextFundingTime,
  fundingIntervalHours,
  onOrderSelect,
  onOrderCancelled,
  activeTPOrderId,
  activeSLOrderId,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const hasUserInteracted = useRef(false);
  const hasSetInitialTab = useRef(false);
  const tabsListRef = useRef<TabsListRef>(null);
  const prevExternalActiveTabIdRef = useRef<string | undefined>(
    externalActiveTabId,
  );

  // Subscribe to data internally (marketStats moved to StatisticsTabContent to isolate price updates)
  const { positions } = usePerpsLivePositions({
    throttleMs: 0,
    useLivePnl: true,
  });
  const { orders: allOrders } = usePerpsLiveOrders({ throttleMs: 0 });

  // Subscribe to live prices for current position price
  const livePrices = usePerpsLivePrices({
    symbols: symbol ? [symbol] : [],
    throttleMs: 1000,
  });

  const position = useMemo(
    () => positions.find((p) => p.coin === symbol) || null,
    [positions, symbol],
  );
  const unfilledOrders = useMemo(
    () => allOrders.filter((o) => o.symbol === symbol),
    [allOrders, symbol],
  );

  // Get current price for the symbol
  const currentPrice = useMemo(() => {
    const priceData = livePrices[symbol];
    if (priceData?.price) {
      return parseFloat(priceData.price);
    }
    // Fallback to position entry price if available
    if (position?.entryPrice) {
      return parseFloat(position.entryPrice);
    }
    return 0;
  }, [livePrices, symbol, position]);

  // State to track which orders are being cancelled for UI display
  const [cancellingOrderIds, setCancellingOrderIds] = useState<Set<string>>(
    new Set(),
  );

  // State to track orders that were successfully cancelled but not yet removed from unfilledOrders
  const [successfullyCancelledOrderIds, setSuccessfullyCancelledOrderIds] =
    useState<Set<string>>(new Set());

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  const sortedUnfilledOrders = useMemo(() => {
    // Filter out successfully cancelled orders that haven't been removed by WebSocket yet
    const filteredOrders = unfilledOrders.filter(
      (order) => !successfullyCancelledOrderIds.has(order.orderId),
    );

    // Sort by order type and ID (price-based execution priority removed to avoid parent re-renders)
    return filteredOrders.sort((a, b) => {
      const orderTypeA = a.detailedOrderType || a.orderType || 'Unknown';
      const orderTypeB = b.detailedOrderType || b.orderType || 'Unknown';

      // Primary sort: by detailedOrderType (alphabetical for consistent grouping)
      if (orderTypeA !== orderTypeB) {
        return orderTypeA.localeCompare(orderTypeB);
      }

      // Secondary sort: by order ID for stable sorting
      return a.orderId.localeCompare(b.orderId);
    });
  }, [unfilledOrders, successfullyCancelledOrderIds]);

  // Clean up successfully cancelled orders when they're actually removed from unfilledOrders
  useEffect(() => {
    if (successfullyCancelledOrderIds.size > 0) {
      const currentOrderIds = new Set(
        unfilledOrders.map((order) => order.orderId),
      );
      const orderIdsToCleanup = Array.from(
        successfullyCancelledOrderIds,
      ).filter((orderId) => !currentOrderIds.has(orderId));

      if (orderIdsToCleanup.length > 0) {
        setSuccessfullyCancelledOrderIds((prev) => {
          const newSet = new Set(prev);
          orderIdsToCleanup.forEach((orderId) => newSet.delete(orderId));
          return newSet;
        });
      }
    }
  }, [unfilledOrders, successfullyCancelledOrderIds]);

  // Position management callbacks
  const handleAutoClosePress = useCallback(() => {
    if (!position) return;

    navigation.navigate(Routes.PERPS.TPSL, {
      asset: position.coin,
      currentPrice,
      position,
      initialTakeProfitPrice: position.takeProfitPrice,
      initialStopLossPrice: position.stopLossPrice,
      onConfirm: async () => {
        // TP/SL is set directly on the position, no need to handle here
        // The position will update via WebSocket
      },
    });
  }, [position, currentPrice, navigation]);

  const handleMarginPress = useCallback(() => {
    if (!position) return;

    navigation.navigate(Routes.PERPS.SELECT_ADJUST_MARGIN_ACTION, {
      position,
    });
  }, [position, navigation]);

  const handleSharePress = useCallback(() => {
    if (!position) return;

    navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
      position,
      marketPrice: currentPrice.toString(),
    });
  }, [position, currentPrice, navigation]);

  const tabs = React.useMemo(() => {
    const dynamicTabs = [];

    // Only show position tab if there's a position
    if (position) {
      dynamicTabs.push({
        id: 'position',
        label: strings('perps.market.position'),
      });
    }

    // Only show orders tab if there are orders (use sortedUnfilledOrders for consistency with tabsToRender)
    if (sortedUnfilledOrders.length > 0) {
      dynamicTabs.push({
        id: 'orders',
        label: strings('perps.market.orders'),
      });
    }

    // Always show statistics tab
    dynamicTabs.push({
      id: 'statistics',
      label: strings('perps.market.statistics'),
    });

    return dynamicTabs;
  }, [position, sortedUnfilledOrders.length]);

  // Initialize with first available tab based on priority
  const [activeTabId, setActiveTabId] = useState<PerpsTabId>(() => {
    if (initialTab) {
      return initialTab;
    }

    // Auto-select based on priority
    if (position) {
      return 'position';
    }
    if (sortedUnfilledOrders.length > 0) {
      return 'orders';
    }
    return 'statistics';
  });

  // Mark that we have an initialTab prop to prevent auto-selection from overriding it
  useEffect(() => {
    if (initialTab && !hasSetInitialTab.current) {
      hasSetInitialTab.current = true;
    }
  }, [initialTab]);

  // Handle initialTab when it becomes available after data loads
  useEffect(() => {
    if (initialTab && !hasUserInteracted.current) {
      const availableTabs = tabs.map((t) => t.id);
      if (availableTabs.includes(initialTab)) {
        setActiveTabId(initialTab as PerpsTabId);
        onActiveTabChange?.(initialTab);
      }
    }
  }, [initialTab, tabs, onActiveTabChange]);

  // Set initial tab based on data availability
  // Now we can properly distinguish between loading and empty states
  useEffect(() => {
    // If user has interacted, respect their choice
    if (hasUserInteracted.current) {
      return;
    }

    // If we've already set the initial tab from props, don't override it
    if (hasSetInitialTab.current) {
      return;
    }

    // If initialTab is provided, don't auto-select - let the initialTab effect handle it
    if (initialTab) {
      return;
    }

    let targetTabId = 'statistics'; // Default fallback

    // Priority 1: Position tab if position exists
    if (position) {
      targetTabId = 'position';
    }
    // Priority 2: Orders tab if orders exist but no position
    else if (sortedUnfilledOrders.length > 0) {
      targetTabId = 'orders';
    }
    // Priority 3: Statistics tab (already set)

    // Only update if tab actually needs to change
    if (activeTabId !== targetTabId) {
      setActiveTabId(targetTabId as PerpsTabId);
      onActiveTabChange?.(targetTabId);
    }
  }, [
    position,
    sortedUnfilledOrders,
    activeTabId,
    onActiveTabChange,
    initialTab,
  ]);

  // Update active tab if current tab is no longer available (but respect user interaction)
  useEffect(() => {
    const tabIds = tabs.map((t) => t.id);
    if (!tabIds.includes(activeTabId)) {
      // If we have an initialTab, wait for that tab's data to load - don't switch away
      if (initialTab && !hasUserInteracted.current) {
        return;
      }

      // Switch to first available tab if current tab is hidden
      const newTabId = tabs[0]?.id || 'statistics';
      setActiveTabId(newTabId as PerpsTabId);
      onActiveTabChange?.(newTabId);
    }
  }, [tabs, activeTabId, onActiveTabChange, initialTab]);

  // Handle programmatic tab control from external activeTabId prop
  useEffect(() => {
    // Only respond when externalActiveTabId explicitly changes
    if (
      externalActiveTabId &&
      externalActiveTabId !== prevExternalActiveTabIdRef.current
    ) {
      prevExternalActiveTabIdRef.current = externalActiveTabId;
      setActiveTabId(externalActiveTabId as PerpsTabId);
    }
  }, [externalActiveTabId]);

  // Notify parent when tab changes (updated for TabsList API)
  const handleTabChange = useCallback(
    (changeTabProperties: { i: number; ref: React.ReactNode }) => {
      hasUserInteracted.current = true; // Mark that user has interacted

      // Map index back to tabId for compatibility with existing parent components
      const availableTabIds: PerpsTabId[] = [];
      if (position) availableTabIds.push('position');
      if (sortedUnfilledOrders.length > 0) availableTabIds.push('orders');
      availableTabIds.push('statistics'); // Always available

      const tabId = availableTabIds[changeTabProperties.i];
      if (tabId) {
        setActiveTabId(tabId);
        onActiveTabChange?.(tabId);
      }
    },
    [position, sortedUnfilledOrders.length, onActiveTabChange],
  );

  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  const handleOrderCancel = useCallback(
    async (orderToCancel: Order) => {
      try {
        // Update UI state to show loading spinner
        setCancellingOrderIds((prev) =>
          new Set(prev).add(orderToCancel.orderId),
        );

        DevLogger.log('Canceling order:', orderToCancel.orderId);

        const controller = Engine.context.PerpsController;

        const orderDirection = getOrderDirection(
          orderToCancel.side,
          position?.size,
        );

        showToast(
          PerpsToastOptions.orderManagement.shared.cancellationInProgress(
            orderDirection as OrderDirection,
            orderToCancel.remainingSize,
            orderToCancel.symbol,
            orderToCancel.detailedOrderType,
          ),
        );

        const result = await controller.cancelOrder({
          orderId: orderToCancel.orderId,
          coin: orderToCancel.symbol,
        });

        // Order cancellation successful
        if (result.success) {
          // Mark order as successfully cancelled to hide it from UI until WebSocket updates arrive
          setSuccessfullyCancelledOrderIds((prev) =>
            new Set(prev).add(orderToCancel.orderId),
          );

          showToast(
            PerpsToastOptions.orderManagement.shared.cancellationSuccess(
              orderToCancel.reduceOnly,
              orderToCancel.detailedOrderType,
              orderDirection as OrderDirection,
              orderToCancel.remainingSize,
              orderToCancel.symbol,
            ),
          );

          // Notify parent component that order was cancelled to update chart
          onOrderCancelled?.(orderToCancel.orderId);

          return;
        }

        // Order cancellation failed
        showToast(PerpsToastOptions.orderManagement.shared.cancellationFailed);
      } catch (error) {
        DevLogger.log('Failed to cancel order:', error);

        showToast(PerpsToastOptions.orderManagement.shared.cancellationFailed);

        // Capture exception with order context
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            tags: {
              component: 'PerpsMarketTabs',
              action: 'order_cancellation',
              operation: 'order_management',
            },
            extra: {
              orderContext: {
                orderId: orderToCancel.orderId,
                symbol: orderToCancel.symbol,
                side: orderToCancel.side,
                orderType: orderToCancel.orderType,
                size: orderToCancel.size,
                price: orderToCancel.price,
                reduceOnly: orderToCancel.reduceOnly,
              },
            },
          },
        );
      } finally {
        // Remove from UI loading state
        setCancellingOrderIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(orderToCancel.orderId);
          return newSet;
        });
      }
    },
    [
      position?.size,
      showToast,
      PerpsToastOptions.orderManagement.shared,
      onOrderCancelled,
    ],
  );

  // Define tab props objects (similar to wallet's tokensTabProps, perpsTabProps pattern)
  const positionTabProps = useMemo(
    () => ({
      key: 'position-tab',
      tabLabel: strings('perps.market.position'),
      position,
      showIcon: true,
      onAutoClosePress: handleAutoClosePress,
      onMarginPress: handleMarginPress,
      onSharePress: handleSharePress,
    }),
    [position, handleAutoClosePress, handleMarginPress, handleSharePress],
  );

  const ordersTabProps = useMemo(
    () => ({
      key: 'orders-tab',
      tabLabel: strings('perps.market.orders'),
      sortedUnfilledOrders,
      activeTPOrderId,
      activeSLOrderId,
      cancellingOrderIds,
      onOrderCancel: handleOrderCancel,
      onOrderSelect,
    }),
    [
      sortedUnfilledOrders,
      activeTPOrderId,
      activeSLOrderId,
      cancellingOrderIds,
      handleOrderCancel,
      onOrderSelect,
    ],
  );

  const statisticsTabProps = useMemo(
    () => ({
      key: 'statistics-tab',
      tabLabel: strings('perps.market.statistics'),
      symbol,
      onTooltipPress: handleTooltipPress,
      nextFundingTime,
      fundingIntervalHours,
    }),
    [symbol, handleTooltipPress, nextFundingTime, fundingIntervalHours],
  );

  // Build tabs array dynamically based on data availability (similar to wallet pattern)
  const tabsToRender = useMemo(() => {
    const tabComponents = [];

    // Only show position tab if there's a position
    if (position) {
      tabComponents.push(
        <PositionTabContent {...positionTabProps} key={positionTabProps.key} />,
      );
    }

    // Only show orders tab if there are orders
    if (sortedUnfilledOrders.length > 0) {
      tabComponents.push(
        <OrdersTabContent {...ordersTabProps} key={ordersTabProps.key} />,
      );
    }

    // Always show statistics tab (fallback)
    // Note: tabLabel is passed for TabsList to extract, but not used by StatisticsTabContent
    tabComponents.push(
      <StatisticsTabContent
        {...statisticsTabProps}
        key={statisticsTabProps.key}
      />,
    );

    return tabComponents;
  }, [
    position,
    positionTabProps,
    sortedUnfilledOrders.length,
    ordersTabProps,
    statisticsTabProps,
  ]);

  const renderTooltipModal = useCallback(() => {
    if (!selectedTooltip) return null;

    return (
      // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
      <View>
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={handleTooltipClose}
            contentKey={selectedTooltip}
            testID={PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
            key={selectedTooltip}
          />
        </Modal>
      </View>
    );
  }, [selectedTooltip, handleTooltipClose]);

  // Key for TabsList to force remount when tab count changes
  const tabsKey = useMemo(
    () => `tabs-${tabs.length}-${tabsToRender.length}`,
    [tabs.length, tabsToRender.length],
  );

  // Calculate active index for TabsList
  const activeIndex = useMemo(() => {
    const availableTabIds: PerpsTabId[] = [];
    if (position) availableTabIds.push('position');
    if (sortedUnfilledOrders.length > 0) availableTabIds.push('orders');
    availableTabIds.push('statistics');
    return Math.max(0, availableTabIds.indexOf(activeTabId));
  }, [activeTabId, position, sortedUnfilledOrders.length]);

  // Sync TabsList to active tab after remount (when key changes)
  useEffect(() => {
    // Enabled only in test mode
    // https://github.com/MetaMask/metamask-mobile/pull/22632
    const isInTestMode = process.env.JEST_WORKER_ID || process.env.E2E;
    if (tabsListRef.current && activeIndex >= 0 && isInTestMode) {
      tabsListRef.current.goToTabIndex(activeIndex);
    }
  }, [tabsKey, activeIndex, activeTabId]);

  if (tabs.length === 1 && tabs[0].id === 'statistics') {
    return (
      <View style={styles.singleTabContainer}>
        <Text
          variant={TextVariant.HeadingSM}
          color={TextColor.Default}
          style={styles.statisticsTitle}
          testID={PerpsMarketTabsSelectorsIDs.STATISTICS_ONLY_TITLE}
        >
          {strings('perps.market.statistics')}
        </Text>

        <StatisticsTabContent
          symbol={symbol}
          onTooltipPress={handleTooltipPress}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />
        {renderTooltipModal()}
      </View>
    );
  }

  // Use TabsList for swipeable tabs (similar to wallet pattern)
  return (
    <View
      style={styles.container}
      testID={PerpsMarketTabsSelectorsIDs.CONTAINER}
    >
      <TabsList key={tabsKey} ref={tabsListRef} onChangeTab={handleTabChange}>
        {tabsToRender}
      </TabsList>
      {renderTooltipModal()}
    </View>
  );
};

export default React.memo(PerpsMarketTabs);
