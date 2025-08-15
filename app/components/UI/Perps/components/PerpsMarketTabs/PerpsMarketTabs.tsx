import React, { useCallback, useState, useEffect, useRef } from 'react';
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
import PerpsMarketStatisticsCard from '../PerpsMarketStatisticsCard';
import PerpsPositionCard from '../PerpsPositionCard';
import { PerpsMarketTabsProps } from './PerpsMarketTabs.types';
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

const PerpsMarketTabs: React.FC<PerpsMarketTabsProps> = ({
  marketStats,
  position,
  isLoadingPosition,
  unfilledOrders = [],
  onPositionUpdate,
  onActiveTabChange,
  priceData,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);

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

  // Tab configuration
  const tabs = [
    {
      id: 'position',
      label: strings('perps.market.position'),
    },
    {
      id: 'orders',
      label: strings('perps.market.orders'),
    },
    {
      id: 'statistics',
      label: strings('perps.market.statistics'),
    },
  ];

  const [activeTabId, setActiveTabId] = useState(tabs[0].id);

  // Notify parent when tab changes
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
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

  const handleOrderCancel = useCallback(async (orderToCancel: Order) => {
    try {
      DevLogger.log('Canceling order:', orderToCancel.orderId);
      const controller = Engine.context.PerpsController;
      await controller.cancelOrder({
        orderId: orderToCancel.orderId,
        coin: orderToCancel.symbol,
      });
      DevLogger.log('Order cancellation request sent');
    } catch (error) {
      DevLogger.log('Failed to cancel order:', error);
    }
  }, []);

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

  // If no position and no orders after loading, show just statistics
  if (!position && unfilledOrders.length === 0) {
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
          marketStats={marketStats}
          onTooltipPress={handleTooltipPress}
        />
        {renderTooltipModal()}
      </Animated.View>
    );
  }

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
            testID={
              tab.id === 'position'
                ? PerpsMarketTabsSelectorsIDs.POSITION_TAB
                : tab.id === 'orders'
                ? PerpsMarketTabsSelectorsIDs.ORDERS_TAB
                : PerpsMarketTabsSelectorsIDs.STATISTICS_TAB
            }
          >
            <Text
              variant={TextVariant.BodyMDBold}
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
              onPositionUpdate={onPositionUpdate}
              priceData={priceData}
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
              marketStats={marketStats}
              onTooltipPress={handleTooltipPress}
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
                {unfilledOrders.map((order) => (
                  <PerpsOpenOrderCard
                    key={order.orderId}
                    order={order}
                    expanded
                    showIcon
                    onCancel={handleOrderCancel}
                  />
                ))}
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
