import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  PerpsPositionsViewSelectorsIDs,
  PerpsTabViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import PerpsCard from '../../components/PerpsCard';
import { PerpsTabControlBar } from '../../components/PerpsTabControlBar';
import {
  TouchablePerpsComponent,
  useCoordinatedPress,
} from '../../components/PressablePerpsComponent/PressablePerpsComponent';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import type { PerpsNavigationParamList } from '../../controllers/types';
import {
  usePerpsEventTracking,
  usePerpsFirstTimeUser,
  usePerpsLivePositions,
  usePerpsPerformance,
} from '../../hooks';
import { usePerpsLiveAccount, usePerpsLiveOrders } from '../../hooks/stream';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import styleSheet from './PerpsTabView.styles';

import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { PerpsEmptyState } from '../PerpsEmptyState';
import { ScrollSyncedVirtualizedList } from '../../../../../component-library/components-temp/ScrollSyncedVirtualizedList';

interface PerpsTabViewProps {
  parentScrollY?: number;
  parentViewportHeight?: number;
}

const PerpsTabView: React.FC<PerpsTabViewProps> = ({
  parentScrollY = 0,
  parentViewportHeight = 0,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { track } = usePerpsEventTracking();
  const { account } = usePerpsLiveAccount();

  const hasTrackedHomescreen = useRef(false);
  const { startMeasure, endMeasure } = usePerpsPerformance();

  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000, // Update positions every second
  });

  const orders = usePerpsLiveOrders({
    hideTpSl: true, // Filter out TP/SL orders
    throttleMs: 1000, // Update orders every second
  });

  const isEligible = useSelector(selectPerpsEligibility);

  const { isFirstTimeUser } = usePerpsFirstTimeUser();

  const hasPositions = positions && positions.length > 0;
  const hasOrders = orders && orders.length > 0;
  const hasNoPositionsOrOrders = !hasPositions && !hasOrders;

  interface CombinedDataItem {
    type: 'position' | 'order' | 'start_trade_cta';
    data?: unknown;
    index?: number;
  }

  const combinedData = useMemo(() => {
    const items: CombinedDataItem[] = [];

    // Add positions without section header (header will be rendered outside)
    if (hasPositions) {
      positions.forEach((position, index) => {
        items.push({ type: 'position', data: position, index });
      });
    }

    // Add orders without section header (header will be rendered outside)
    if (hasOrders) {
      orders.forEach((order, index) => {
        items.push({ type: 'order', data: order, index });
      });
    }

    // Add CTA at the end
    if (hasPositions || hasOrders) {
      items.push({ type: 'start_trade_cta' });
    }

    return items;
  }, [positions, orders, hasPositions, hasOrders]);

  // Start measuring position data load time on mount
  useEffect(() => {
    startMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB);
  }, [startMeasure]);

  // Track homescreen tab viewed - only once when positions and account are loaded
  useEffect(() => {
    if (
      !hasTrackedHomescreen.current &&
      !isInitialLoading &&
      positions &&
      account?.totalBalance !== undefined
    ) {
      // Track position data loaded performance
      endMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB);

      // Track homescreen tab viewed event with exact property names from requirements
      track(MetaMetricsEvents.PERPS_HOMESCREEN_TAB_VIEWED, {
        [PerpsEventProperties.OPEN_POSITION]: positions.map((p) => ({
          [PerpsEventProperties.ASSET]: p.coin,
          [PerpsEventProperties.LEVERAGE]: p.leverage.value,
          [PerpsEventProperties.DIRECTION]:
            parseFloat(p.size) > 0
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
        })),
      });

      hasTrackedHomescreen.current = true;
    }
  }, [isInitialLoading, positions, account?.totalBalance, track, endMeasure]);

  const handleManageBalancePress = useCallback(() => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.BALANCE_MODAL,
    });
  }, [navigation, isEligible]);

  const handleNewTrade = useCallback(() => {
    if (isFirstTimeUser) {
      // Navigate to tutorial for first-time users
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TUTORIAL,
      });
    } else {
      // Navigate to trading view for returning users
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKETS,
      });
    }
  }, [navigation, isFirstTimeUser]);

  const coordinatedPress = useCoordinatedPress();

  const memoizedPressHandler = useCallback(() => {
    coordinatedPress(handleNewTrade);
  }, [coordinatedPress, handleNewTrade]);

  const renderStartTradeCTA = useCallback(
    () => (
      <TouchablePerpsComponent
        style={styles.startTradeCTA}
        onPress={memoizedPressHandler}
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
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.startTradeText}
          >
            {strings('perps.position.list.start_new_trade')}
          </Text>
        </View>
      </TouchablePerpsComponent>
    ),
    [
      styles.startTradeCTA,
      styles.startTradeContent,
      styles.startTradeIconContainer,
      styles.startTradeText,
      memoizedPressHandler,
    ],
  );

  const renderVirtualizedItem = useCallback(
    ({ item }: { item: CombinedDataItem }) => {
      switch (item.type) {
        case 'position': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const position = item.data as any;
          const sizeValue = parseFloat(position?.size || '0');
          const directionSegment = Number.isFinite(sizeValue)
            ? sizeValue > 0
              ? 'long'
              : sizeValue < 0
              ? 'short'
              : 'unknown'
            : 'unknown';
          return (
            <View
              testID={`${PerpsPositionsViewSelectorsIDs.POSITION_ITEM}-${position?.coin}-${position?.leverage?.value}x-${directionSegment}-${item.index}`}
            >
              <PerpsCard position={position} />
            </View>
          );
        }

        case 'order': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const order = item.data as any;
          return <PerpsCard key={order?.orderId} order={order} />;
        }

        case 'start_trade_cta': {
          return renderStartTradeCTA();
        }

        default:
          return null;
      }
    },
    [renderStartTradeCTA],
  );

  const keyExtractor = useCallback((item: CombinedDataItem, index: number) => {
    switch (item.type) {
      case 'position': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const position = item.data as any;
        return `position-${position?.coin}-${item.index}`;
      }
      case 'order': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const order = item.data as any;
        return `order-${order?.orderId}`;
      }
      case 'start_trade_cta':
        return 'start-trade-cta';
      default:
        return `item-${index}`;
    }
  }, []);

  return (
    <SafeAreaView style={styles.wrapper} edges={['left', 'right']}>
      <>
        <PerpsTabControlBar
          onManageBalancePress={handleManageBalancePress}
          hasPositions={hasPositions}
          hasOrders={hasOrders}
        />
        <View style={styles.content}>
          <View style={styles.contentContainer}>
            {!isInitialLoading && hasNoPositionsOrOrders ? (
              <PerpsEmptyState
                onStartTrading={handleNewTrade}
                testID="perps-empty-state"
                twClassName="mx-auto"
              />
            ) : isInitialLoading ? (
              <Skeleton
                height={30}
                width="100%"
                style={styles.loadingContainer}
              />
            ) : (
              <>
                {/* Render section headers outside the virtualized list */}
                {hasPositions && (
                  <View style={styles.sectionHeader}>
                    <Text
                      variant={TextVariant.BodyMDMedium}
                      style={styles.sectionTitle}
                      testID={
                        PerpsPositionsViewSelectorsIDs.POSITIONS_SECTION_TITLE
                      }
                    >
                      {strings('perps.position.title')}
                    </Text>
                  </View>
                )}

                {hasOrders && (
                  <View style={styles.sectionHeader}>
                    <Text
                      variant={TextVariant.BodyMDMedium}
                      style={styles.sectionTitle}
                    >
                      {strings('perps.order.open_orders')}
                    </Text>
                  </View>
                )}

                <ScrollSyncedVirtualizedList
                  data={combinedData}
                  renderItem={renderVirtualizedItem}
                  keyExtractor={keyExtractor}
                  itemHeight={80}
                  parentScrollY={parentScrollY}
                  _parentViewportHeight={parentViewportHeight}
                  testID="perps-virtualized-list"
                />
              </>
            )}
          </View>
        </View>
        {isEligibilityModalVisible && (
          // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
          <View>
            <Modal
              visible
              transparent
              animationType="none"
              statusBarTranslucent
            >
              <PerpsBottomSheetTooltip
                isVisible
                onClose={() => setIsEligibilityModalVisible(false)}
                contentKey={'geo_block'}
                testID={PerpsTabViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP}
              />
            </Modal>
          </View>
        )}
      </>
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
