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
import { MarketDetailsTabsProps } from './PerpsMarketTabs.types';
import styleSheet from './PerpsMarketTabs.styles';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsOrderCard from '../PerpsOrderCard';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../../core/Engine';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

const MarketDetailsTabs: React.FC<MarketDetailsTabsProps> = ({
  marketStats,
  position,
  isLoadingPosition,
  unfilledOrders = [],
  onPositionUpdate,
  onActiveTabChange,
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
        <View style={styles.skeletonTabBar}>
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
        <View style={styles.tabContent}>
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
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab]}
            onPress={() => handleTabChange(tab.id)}
            activeOpacity={0.7}
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
          <View style={styles.tabContent}>
            <PerpsPositionCard
              key={`${position.coin}`}
              position={position}
              expanded
              showIcon
              onPositionUpdate={onPositionUpdate}
            />
          </View>
        );

      case 'statistics':
        return (
          <View style={styles.tabContent}>
            <PerpsMarketStatisticsCard
              marketStats={marketStats}
              onTooltipPress={handleTooltipPress}
            />
          </View>
        );

      case 'orders':
        return (
          <View style={styles.tabContent}>
            {unfilledOrders.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Icon
                  name={IconName.Book}
                  size={IconSize.Xl}
                  color={TextColor.Muted}
                  style={styles.emptyStateIcon}
                />
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Muted}
                  style={styles.emptyStateText}
                >
                  {strings('perps.no_open_orders')}
                </Text>
              </View>
            ) : (
              <>
                {unfilledOrders.map((order) => (
                  <PerpsOrderCard
                    key={order.orderId}
                    order={order}
                    expanded
                    showIcon
                    onCancel={async (orderToCancel) => {
                      try {
                        DevLogger.log(
                          'Canceling order:',
                          orderToCancel.orderId,
                        );
                        const controller = Engine.context.PerpsController;
                        await controller.cancelOrder({
                          orderId: orderToCancel.orderId,
                          coin: orderToCancel.symbol,
                        });
                        DevLogger.log('Order cancellation request sent');
                      } catch (error) {
                        DevLogger.log('Failed to cancel order:', error);
                      }
                    }}
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
    <Animated.View style={{ opacity: fadeAnim }}>
      {renderTabBar()}
      {renderTabContent()}
      {renderTooltipModal()}
    </Animated.View>
  );
};

export default MarketDetailsTabs;
