import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { View, Modal, TouchableOpacity, Animated } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { captureException } from '@sentry/react-native';
import PerpsMarketStatisticsCard from '../PerpsMarketStatisticsCard';
import PerpsPositionCard from '../PerpsPositionCard';
import { PerpsMarketTabsProps, PerpsTabId } from './PerpsMarketTabs.types';
import styleSheet from './PerpsMarketTabs.styles';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketTabsSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsOpenOrderCard from '../PerpsOpenOrderCard';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../../core/Engine';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { Order } from '../../controllers/types';
import { getOrderDirection } from '../../utils/orderUtils';
import usePerpsToasts from '../../hooks/usePerpsToasts';
import { OrderDirection } from '../../types';

const PerpsMarketTabs: React.FC<PerpsMarketTabsProps> = ({
  symbol,
  marketStats,
  position,
  isLoadingPosition,
  unfilledOrders = [],
  onActiveTabChange,
  initialTab,
  nextFundingTime,
  fundingIntervalHours,
  onOrderSelect,
  onOrderCancelled,
  activeTPOrderId,
  activeSLOrderId,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasUserInteracted = useRef(false);
  const hasSetInitialTab = useRef(false);

  // Track order cancellation requests in progress to prevent duplicate requests
  const orderWithInProgressCancellation = useRef<{ [key: string]: boolean }>(
    {},
  );

  const [isAnyOrderBeingCancelled, setIsAnyOrderBeingCancelled] =
    useState(false);

  const { showToast, PerpsToastOptions } = usePerpsToasts();

  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

  const sortedUnfilledOrders = useMemo(() => {
    // Pre-compute current price to avoid repeated calculations
    const currentPrice = marketStats.currentPrice || 0;

    // Pre-compute order metadata for efficient sorting
    const ordersWithMetadata = unfilledOrders.map((order) => {
      const orderType = order.detailedOrderType || order.orderType || 'Unknown';
      const triggerPrice = parseFloat(
        order.takeProfitPrice || order.stopLossPrice || order.price || '0',
      );

      // Calculate execution priority (distance to current price)
      const executionPriority =
        triggerPrice === 0 || currentPrice === 0
          ? Infinity
          : Math.abs(triggerPrice - currentPrice);

      return {
        order,
        orderType,
        executionPriority,
      };
    });

    // Sort with pre-computed metadata
    return ordersWithMetadata
      .sort((a, b) => {
        // Primary sort: by detailedOrderType (alphabetical for consistent grouping)
        if (a.orderType !== b.orderType) {
          return a.orderType.localeCompare(b.orderType);
        }

        // Secondary sort: by execution priority within same detailedOrderType
        if (a.executionPriority !== b.executionPriority) {
          return a.executionPriority - b.executionPriority;
        }

        // Final tiebreaker: order ID
        return a.order.orderId.localeCompare(b.order.orderId);
      })
      .map((item) => item.order);
  }, [unfilledOrders, marketStats.currentPrice]);

  // Fade in animation when loading completes
  useEffect(() => {
    if (!isLoadingPosition) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoadingPosition, fadeAnim]);

  const tabs = React.useMemo(() => {
    const dynamicTabs = [];

    // Always show statistics tab
    dynamicTabs.push({
      id: 'statistics',
      label: strings('perps.market.statistics'),
    });

    // Only show position tab if there's a position
    if (position) {
      dynamicTabs.push({
        id: 'position',
        label: strings('perps.market.position'),
      });
    }

    // Only show orders tab if there are orders
    if (unfilledOrders.length > 0) {
      dynamicTabs.push({
        id: 'orders',
        label: strings('perps.market.orders'),
      });
    }

    return dynamicTabs;
  }, [position, unfilledOrders.length]);

  // Initialize with initialTab or statistics by default
  const [activeTabId, setActiveTabId] = useState<PerpsTabId>(
    initialTab || 'statistics',
  );

  // Handle initialTab when it becomes available after data loads
  useEffect(() => {
    if (initialTab && !hasUserInteracted.current && !hasSetInitialTab.current) {
      const availableTabs = tabs.map((t) => t.id);
      if (availableTabs.includes(initialTab)) {
        setActiveTabId(initialTab as PerpsTabId);
        onActiveTabChange?.(initialTab);
        hasSetInitialTab.current = true;
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

    // Wait until position data has loaded
    // isLoadingPosition will be true until first WebSocket update
    if (isLoadingPosition) {
      return;
    }

    let targetTabId = 'statistics'; // Default fallback

    // Priority 1: Position tab if position exists
    if (position) {
      targetTabId = 'position';
    }
    // Priority 2: Orders tab if orders exist but no position
    else if (unfilledOrders && unfilledOrders.length > 0) {
      targetTabId = 'orders';
    }
    // Priority 3: Statistics tab (already set)

    // Only update if tab actually needs to change
    if (activeTabId !== targetTabId) {
      DevLogger.log('PerpsMarketTabs: Auto-selecting tab:', {
        targetTabId,
        hasPosition: !!position,
        ordersCount: unfilledOrders?.length || 0,
        previousTab: activeTabId,
        isLoadingPosition,
      });
      setActiveTabId(targetTabId as PerpsTabId);
      onActiveTabChange?.(targetTabId);
    }
  }, [
    position,
    unfilledOrders,
    activeTabId,
    onActiveTabChange,
    isLoadingPosition,
  ]);

  // Update active tab if current tab is no longer available (but respect user interaction)
  useEffect(() => {
    const tabIds = tabs.map((t) => t.id);
    if (!tabIds.includes(activeTabId)) {
      // Switch to first available tab if current tab is hidden
      const newTabId = tabs[0]?.id || 'statistics';
      setActiveTabId(newTabId as PerpsTabId);
      onActiveTabChange?.(newTabId);
    }
  }, [tabs, activeTabId, onActiveTabChange]);

  // Notify parent when tab changes
  const handleTabChange = useCallback(
    (tabId: string) => {
      hasUserInteracted.current = true; // Mark that user has interacted
      setActiveTabId(tabId as PerpsTabId);
      onActiveTabChange?.(tabId);
    },
    [onActiveTabChange],
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
        // Prevent duplicate cancellation requests for the same orderId
        if (orderWithInProgressCancellation.current[orderToCancel.orderId]) {
          return;
        }

        setIsAnyOrderBeingCancelled(true);
        orderWithInProgressCancellation.current[orderToCancel.orderId] = true;

        DevLogger.log('Canceling order:', orderToCancel.orderId);

        const controller = Engine.context.PerpsController;

        const orderDirection = getOrderDirection(
          orderToCancel.side,
          position?.size,
        );

        showToast(
          PerpsToastOptions.orderManagement.limit.cancellationInProgress(
            orderDirection as OrderDirection,
            orderToCancel.remainingSize,
            orderToCancel.symbol,
          ),
        );

        const result = await controller.cancelOrder({
          orderId: orderToCancel.orderId,
          coin: orderToCancel.symbol,
        });

        // Order cancellation successful
        if (result.success) {
          if (orderToCancel.reduceOnly) {
            // Distinction is important since reduce-only orders don't require margin.
            // So we shouldn't display "Your funds are available to trade" in the toast.
            showToast(
              PerpsToastOptions.orderManagement.limit.reduceOnlyClose
                .cancellationSuccess,
            );
          } else {
            // In regular limit order, funds are "locked up" and the "funds are available to trade" text in toast makes sense.
            showToast(
              PerpsToastOptions.orderManagement.limit.cancellationSuccess,
            );
          }

          // Notify parent component that order was cancelled to update chart
          onOrderCancelled?.(orderToCancel.orderId);
        }
        // Open order cancellation failed
        else if (orderToCancel.reduceOnly) {
          // Funds aren't "locked up" for reduce-only orders, so we don't display "Funds have been returned to you" toast.
          showToast(
            PerpsToastOptions.orderManagement.limit.reduceOnlyClose
              .cancellationFailed,
          );
        } else {
          // Display "Funds have been returned to you" toast
          showToast(PerpsToastOptions.orderManagement.limit.cancellationFailed);
        }
      } catch (error) {
        DevLogger.log('Failed to cancel order:', error);

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
        // Remove to allow retry
        delete orderWithInProgressCancellation.current[orderToCancel.orderId];
        setIsAnyOrderBeingCancelled(false);
      }
    },
    [
      PerpsToastOptions.orderManagement.limit,
      position?.size,
      showToast,
      onOrderCancelled,
    ],
  );

  const renderTooltipModal = useCallback(() => {
    if (!selectedTooltip) return null;

    return (
      <Modal visible transparent animationType="none" statusBarTranslucent>
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          testID={PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
          key={selectedTooltip}
        />
      </Modal>
    );
  }, [selectedTooltip, handleTooltipClose]);

  // Show loading skeleton while position data is loading
  if (isLoadingPosition) {
    return (
      <>
        {/* Tab bar skeleton */}
        <View
          style={styles.skeletonTabBar}
          testID={PerpsMarketTabsSelectorsIDs.SKELETON_TAB_BAR}
        >
          <View style={styles.skeletonTab}>
            <Skeleton height={20} width={80} />
          </View>
          <View style={styles.skeletonTab}>
            <Skeleton height={20} width={60} />
          </View>
          <View style={styles.skeletonTab}>
            <Skeleton height={20} width={90} />
          </View>
        </View>
        {/* Content skeleton */}
        <View
          style={styles.tabContent}
          testID={PerpsMarketTabsSelectorsIDs.SKELETON_CONTENT}
        >
          <Skeleton height={200} style={styles.skeletonContent} />
        </View>
        {renderTooltipModal()}
      </>
    );
  }

  if (tabs.length === 1 && tabs[0].id === 'statistics') {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.statisticsTitle}
          testID={PerpsMarketTabsSelectorsIDs.STATISTICS_ONLY_TITLE}
        >
          {strings('perps.market.statistics')}
        </Text>

        <PerpsMarketStatisticsCard
          symbol={symbol}
          marketStats={marketStats}
          onTooltipPress={handleTooltipPress}
          nextFundingTime={nextFundingTime}
          fundingIntervalHours={fundingIntervalHours}
        />
        {renderTooltipModal()}
      </Animated.View>
    );
  }

  const getTabTestId = (tabId: string) => {
    if (tabId === 'position') return PerpsMarketTabsSelectorsIDs.POSITION_TAB;
    if (tabId === 'orders') return PerpsMarketTabsSelectorsIDs.ORDERS_TAB;
    return PerpsMarketTabsSelectorsIDs.STATISTICS_TAB;
  };

  const renderTabBar = () => (
    <View style={styles.tabBar} testID={PerpsMarketTabsSelectorsIDs.TAB_BAR}>
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab]}
            onPress={() => handleTabChange(tab.id)}
            activeOpacity={0.7}
            testID={getTabTestId(tab.id)}
          >
            <Text
              variant={TextVariant.BodyMD}
              color={isActive ? TextColor.Default : TextColor.Muted}
            >
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTabId) {
      case 'position':
        if (!position || isLoadingPosition) return null;
        return (
          <View
            style={styles.tabContent}
            testID={PerpsMarketTabsSelectorsIDs.POSITION_CONTENT}
          >
            <PerpsPositionCard
              key={`${position.coin}`}
              position={position}
              expanded
              showIcon
              onTooltipPress={handleTooltipPress}
              onTpslCountPress={handleTabChange}
            />
          </View>
        );

      case 'statistics':
        return (
          <View
            style={styles.tabContent}
            testID={PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT}
          >
            <PerpsMarketStatisticsCard
              symbol={symbol}
              marketStats={marketStats}
              onTooltipPress={handleTooltipPress}
              nextFundingTime={nextFundingTime}
              fundingIntervalHours={fundingIntervalHours}
            />
          </View>
        );

      case 'orders':
        return (
          <View
            style={styles.tabContent}
            testID={PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT}
          >
            {unfilledOrders.length === 0 ? (
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
                      onCancel={handleOrderCancel}
                      onSelect={onOrderSelect}
                      isActiveOnChart={isActive}
                      activeType={activeType}
                      disabled={isAnyOrderBeingCancelled}
                    />
                  );
                })}
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      testID={PerpsMarketTabsSelectorsIDs.CONTAINER}
    >
      {renderTabBar()}
      {renderTabContent()}
      {renderTooltipModal()}
    </Animated.View>
  );
};

export default PerpsMarketTabs;
