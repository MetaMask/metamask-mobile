import { useNavigation, type NavigationProp } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import React, { useCallback, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PerpsPositionsViewSelectorsIDs,
  PerpsTabViewSelectorsIDs,
} from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import PerpsCard from '../../components/PerpsCard';
import { PerpsTabControlBar } from '../../components/PerpsTabControlBar';
import { useSelector } from 'react-redux';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import type {
  PerpsNavigationParamList,
  PerpsMarketData,
} from '../../controllers/types';
import {
  usePerpsEventTracking,
  usePerpsFirstTimeUser,
  usePerpsLivePositions,
  usePerpsTabExploreData,
} from '../../hooks';
import { usePerpsLiveAccount, usePerpsLiveOrders } from '../../hooks/stream';
import PerpsWatchlistMarkets from '../../components/PerpsWatchlistMarkets/PerpsWatchlistMarkets';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { getPositionDirection } from '../../utils/positionCalculations';
import styleSheet from './PerpsTabView.styles';
import PerpsTokenLogo from '../../components/PerpsTokenLogo';
import PerpsLeverage from '../../components/PerpsLeverage/PerpsLeverage';
import PerpsBadge from '../../components/PerpsBadge';
import {
  getPerpsDisplaySymbol,
  getMarketBadgeType,
} from '../../utils/marketUtils';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import PerpsRowSkeleton from '../../components/PerpsRowSkeleton';

import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import ConditionalScrollView from '../../../../../component-library/components-temp/ConditionalScrollView';

const PerpsTabView = () => {
  const { styles } = useStyles(styleSheet, {});
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { account } = usePerpsLiveAccount();
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );
  const isEligible = useSelector(selectPerpsEligibility);
  const { track } = usePerpsEventTracking();

  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000, // Update positions every second
  });

  // Track Perps tab load performance - measures time from tab mount to data ready
  usePerpsMeasurement({
    traceName: TraceName.PerpsTabView,
    conditions: [
      !isInitialLoading,
      !!positions,
      account?.totalBalance !== undefined,
    ],
  });

  const { orders } = usePerpsLiveOrders({
    hideTpSl: true, // Filter out TP/SL orders
    throttleMs: 1000, // Update orders every second
  });

  const { isFirstTimeUser } = usePerpsFirstTimeUser();

  const hasPositions = positions && positions.length > 0;
  const hasOrders = orders && orders.length > 0;
  const hasNoPositionsOrOrders = !hasPositions && !hasOrders;

  // Business hook for explore data when no positions/orders
  const {
    exploreMarkets,
    watchlistMarkets,
    isLoading: isExploreLoading,
  } = usePerpsTabExploreData({ enabled: hasNoPositionsOrOrders });

  // Determine balance visibility for conditional header styling
  const totalBalance = account?.totalBalance ?? '0';
  const isBalanceEmpty = BigNumber(totalBalance).isZero();
  const shouldShowBalance = !isBalanceEmpty;

  // Watchlist header: at top, varies by balance
  const watchlistHeaderStyle = shouldShowBalance
    ? styles.watchlistHeaderStyleWithBalance // 24px/4px
    : styles.watchlistHeaderStyleNoBalance; // 16px/4px

  // Check if watchlist is visible (for conditional rendering)
  const isWatchlistVisible = watchlistMarkets.length > 0;

  // Track wallet home perps tab viewed - declarative (main's event name, privacy-compliant count)
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [
      !isInitialLoading,
      !!positions,
      account?.totalBalance !== undefined,
    ],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.WALLET_HOME_PERPS_TAB,
      [PerpsEventProperties.OPEN_POSITION]: positions?.length || 0,
    },
  });

  const handleManageBalancePress = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: PerpsEventValues.SOURCE.HOMESCREEN_TAB },
    });
  }, [navigation]);

  const handleNewTrade = useCallback(() => {
    if (isFirstTimeUser) {
      // Navigate to tutorial for first-time users
      navigation.navigate(Routes.PERPS.TUTORIAL);
    } else {
      // Navigate to trading view for returning users
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: PerpsEventValues.SOURCE.POSITION_TAB },
      });
    }
  }, [navigation, isFirstTimeUser]);

  // Modal handlers - now using navigation to modal stack with geo-restriction check
  const handleCloseAllPress = useCallback(() => {
    // Geo-restriction check for close all positions
    if (!isEligible) {
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PerpsEventProperties.SCREEN_TYPE]:
          PerpsEventValues.SCREEN_TYPE.GEO_BLOCK_NOTIF,
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.CLOSE_ALL_POSITIONS_BUTTON,
      });
      setIsEligibilityModalVisible(true);
      return;
    }
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS,
    });
  }, [isEligible, navigation, track]);

  const handleCancelAllPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
    });
  }, [navigation]);

  const renderStartTradeCTA = () => (
    <TouchableOpacity
      style={styles.startTradeCTA}
      onPress={handleNewTrade}
      testID={PerpsTabViewSelectorsIDs.START_NEW_TRADE_CTA}
    >
      <View style={styles.startTradeContent}>
        <View style={styles.startTradeIconContainer}>
          <Icon
            name={IconName.Add}
            color={IconColor.Default}
            size={IconSize.Sm}
          />
        </View>
        <Text variant={TextVariant.BodyMDMedium} style={styles.startTradeText}>
          {strings('perps.position.list.start_new_trade')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderOrdersSection = () => {
    // Only show orders section if there are active orders
    if (!orders || orders.length === 0) {
      return null;
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text variant={TextVariant.BodyMDMedium} style={styles.sectionTitle}>
            {strings('perps.order.open_orders')}
          </Text>
          <TouchableOpacity onPress={handleCancelAllPress}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.home.cancel_all')}
            </Text>
          </TouchableOpacity>
        </View>
        <View>
          {orders.map((order) => (
            <PerpsCard
              key={order.orderId}
              order={order}
              source={PerpsEventValues.SOURCE.POSITION_TAB}
            />
          ))}
          {(!positions || positions.length === 0) && renderStartTradeCTA()}
        </View>
      </>
    );
  };

  const renderPositionsSection = () => {
    if (isInitialLoading) {
      // Removed loading state as it was redundant to the first loading state and only appeared for very little time
      return (
        <Skeleton height={30} width="100%" style={styles.loadingContainer} />
      );
    }

    if (positions.length === 0) {
      return null;
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.sectionTitle}
            testID={PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION_TITLE}
          >
            {strings('perps.position.title')}
          </Text>
          <TouchableOpacity onPress={handleCloseAllPress}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.home.close_all')}
            </Text>
          </TouchableOpacity>
        </View>
        <View>
          {positions.map((position, index) => {
            const directionSegment = getPositionDirection(position.size);
            return (
              <View
                key={`${position.symbol}-${index}`}
                testID={`${PerpsPositionsViewSelectorsIDs.POSITION_ITEM}-${position.symbol}-${position.leverage.value}x-${directionSegment}-${index}`}
              >
                <PerpsCard
                  key={`${position.symbol}-${index}`}
                  position={position}
                  source={PerpsEventValues.SOURCE.POSITION_TAB}
                />
              </View>
            );
          })}
          {renderStartTradeCTA()}
        </View>
      </>
    );
  };

  // Custom explore market row - isolated styling for PerpsTabView only
  const handleExploreMarketPress = useCallback(
    (market: PerpsMarketData) => {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market },
      });
    },
    [navigation],
  );

  const handleSeeAllPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: PerpsEventValues.SOURCE.HOMESCREEN_TAB },
    });
  }, [navigation]);

  const renderExploreMarketRow = useCallback(
    (market: PerpsMarketData) => {
      const badgeType = getMarketBadgeType(market);
      const isPositiveChange = !market.change24h.startsWith('-');

      return (
        <TouchableOpacity
          key={market.symbol}
          style={styles.exploreMarketRow}
          onPress={() => handleExploreMarketPress(market)}
        >
          <View style={styles.exploreMarketLeft}>
            <View style={styles.exploreMarketIcon}>
              <PerpsTokenLogo
                symbol={market.symbol}
                size={HOME_SCREEN_CONFIG.DefaultIconSize}
              />
            </View>
            <View style={styles.exploreMarketInfo}>
              <View style={styles.exploreMarketHeader}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {getPerpsDisplaySymbol(market.symbol)}
                </Text>
                <PerpsLeverage maxLeverage={market.maxLeverage} />
              </View>
              <View style={styles.exploreMarketSecondRow}>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  numberOfLines={1}
                >
                  {market.volume} {strings('perps.sort.volume_short')}
                </Text>
                {badgeType && <PerpsBadge type={badgeType} />}
              </View>
            </View>
          </View>
          <View style={styles.exploreMarketRight}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              style={styles.exploreMarketPrice}
            >
              {market.price}
            </Text>
            <Text
              variant={TextVariant.BodySM}
              color={isPositiveChange ? TextColor.Success : TextColor.Error}
              style={styles.exploreMarketChange}
            >
              {market.change24hPercent}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, handleExploreMarketPress],
  );

  const renderExploreSection = useCallback(() => {
    if (isExploreLoading) {
      return (
        <View style={styles.exploreSection}>
          <View style={styles.exploreSectionHeader}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {strings('perps.home.explore_markets')}
            </Text>
          </View>
          <PerpsRowSkeleton count={5} />
        </View>
      );
    }

    if (exploreMarkets.length === 0) {
      return null;
    }

    return (
      <View style={styles.exploreSection}>
        <View style={styles.exploreSectionHeader}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('perps.home.explore_markets')}
          </Text>
        </View>
        <View>{exploreMarkets.map(renderExploreMarketRow)}</View>
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={handleSeeAllPerps}
        >
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('perps.home.see_all_perps')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [
    isExploreLoading,
    exploreMarkets,
    styles,
    renderExploreMarketRow,
    handleSeeAllPerps,
  ]);

  return (
    <SafeAreaView
      style={[
        styles.wrapper,
        isHomepageRedesignV1Enabled && { flex: undefined },
      ]}
      edges={['left', 'right']}
    >
      <PerpsTabControlBar
        onManageBalancePress={handleManageBalancePress}
        hasPositions={hasPositions}
        hasOrders={hasOrders}
      />
      <ConditionalScrollView
        isScrollEnabled={!isHomepageRedesignV1Enabled}
        scrollViewProps={{
          style: styles.content,
          testID: PerpsTabViewSelectorsIDs.SCROLL_VIEW,
        }}
      >
        {!isInitialLoading && hasNoPositionsOrOrders ? (
          <View style={styles.emptyStateContainer}>
            {/* Watchlist section - only render if user has watchlist markets */}
            {isWatchlistVisible && (
              <PerpsWatchlistMarkets
                markets={watchlistMarkets}
                isLoading={isExploreLoading}
                positions={[]}
                orders={[]}
                sectionStyle={styles.watchlistSectionStyle}
                headerStyle={watchlistHeaderStyle}
                contentContainerStyle={styles.flatContentContainerStyle}
              />
            )}

            {/* Explore markets section - custom render for PerpsTabView styling */}
            {renderExploreSection()}
          </View>
        ) : (
          <View style={styles.tradeInfoContainer}>
            <View>{renderPositionsSection()}</View>
            <View>{renderOrdersSection()}</View>
          </View>
        )}
      </ConditionalScrollView>
      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={() => setIsEligibilityModalVisible(false)}
              contentKey={'geo_block'}
              testID={PerpsTabViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP}
            />
          </Modal>
        </View>
      )}
    </SafeAreaView>
  );
};

// Enable WDYR tracking in development
// Uncomment to enable WDYR for debugging re-renders
// if (__DEV__) {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   (PerpsTabView as any).whyDidYouRender = {
//     logOnDifferentValues: true,
//     customName: 'PerpsTabView',
//   };
// }

export default PerpsTabView;
