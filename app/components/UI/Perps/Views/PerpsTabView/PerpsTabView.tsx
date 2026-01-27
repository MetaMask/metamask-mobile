import { useNavigation } from '@react-navigation/native';
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
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import {
  usePerpsEventTracking,
  usePerpsFirstTimeUser,
  usePerpsLivePositions,
} from '../../hooks';
import { usePerpsLiveAccount, usePerpsLiveOrders } from '../../hooks/stream';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { getPositionDirection } from '../../utils/positionCalculations';
import styleSheet from './PerpsTabView.styles';

import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { PerpsEmptyState } from '../PerpsEmptyState';
import ConditionalScrollView from '../../../../../component-library/components-temp/ConditionalScrollView';

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const navigation = useNavigation();
  const { account } = usePerpsLiveAccount();
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

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

  // Modal handlers - now using navigation to modal stack
  const handleCloseAllPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS,
    });
  }, [navigation]);

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
                key={`${position.coin}-${index}`}
                testID={`${PerpsPositionsViewSelectorsIDs.POSITION_ITEM}-${position.coin}-${position.leverage.value}x-${directionSegment}-${index}`}
              >
                <PerpsCard
                  key={`${position.coin}-${index}`}
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

  return (
    <SafeAreaView
      style={[
        styles.wrapper,
        isHomepageRedesignV1Enabled && { flex: undefined },
      ]}
      edges={['left', 'right']}
    >
      <>
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
              <PerpsEmptyState
                onAction={handleNewTrade}
                testID="perps-empty-state"
                twClassName="mx-auto"
              />
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
