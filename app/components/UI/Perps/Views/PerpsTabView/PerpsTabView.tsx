import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
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
} from '../../hooks';
import { getPositionDirection } from '../../utils/positionCalculations';
import { usePerpsLiveAccount, usePerpsLiveOrders } from '../../hooks/stream';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import styleSheet from './PerpsTabView.styles';

import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { PerpsEmptyState } from '../PerpsEmptyState';
import { usePerpsDepositProgress } from '../../hooks/usePerpsDepositProgress';

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { account } = usePerpsLiveAccount();

  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000, // Update positions every second
  });

  // Track Perps tab load performance - measures time from tab mount to data ready
  usePerpsMeasurement({
    measurementName: PerpsMeasurementName.PERPS_TAB_LOADED,
    conditions: [
      !isInitialLoading,
      !!positions,
      account?.totalBalance !== undefined,
    ],
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

  // Track homescreen tab viewed - declarative (main's event name, privacy-compliant count)
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [
      !isInitialLoading,
      !!positions,
      account?.totalBalance !== undefined,
    ],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.HOMESCREEN,
      [PerpsEventProperties.OPEN_POSITION]: positions?.length || 0,
    },
  });

  const { isDepositInProgress } = usePerpsDepositProgress();

  const handleManageBalancePress = useCallback(() => {
    if (!isEligible) {
      setIsEligibilityModalVisible(true);
      return;
    }

    if (isDepositInProgress) {
      return;
    }

    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.BALANCE_MODAL,
    });
  }, [navigation, isEligible, isDepositInProgress]);

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
        params: { source: PerpsEventValues.SOURCE.POSITION_TAB },
      });
    }
  }, [navigation, isFirstTimeUser]);

  const coordinatedPress = useCoordinatedPress();

  const memoizedPressHandler = useCallback(() => {
    coordinatedPress(handleNewTrade);
  }, [coordinatedPress, handleNewTrade]);

  const renderStartTradeCTA = () => (
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
        <Text variant={TextVariant.BodyMDMedium} style={styles.startTradeText}>
          {strings('perps.position.list.start_new_trade')}
        </Text>
      </View>
    </TouchablePerpsComponent>
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
    <SafeAreaView style={styles.wrapper} edges={['left', 'right']}>
      <>
        <PerpsTabControlBar
          onManageBalancePress={handleManageBalancePress}
          hasPositions={hasPositions}
          hasOrders={hasOrders}
        />
        <ScrollView style={styles.content}>
          <View style={styles.contentContainer}>
            {!isInitialLoading && hasNoPositionsOrOrders ? (
              <PerpsEmptyState
                onAction={handleNewTrade}
                testID="perps-empty-state"
                twClassName="mx-auto"
              />
            ) : (
              <View style={styles.tradeInfoContainer}>
                <View>{renderPositionsSection()}</View>
                <View>{renderOrdersSection()}</View>
              </View>
            )}
          </View>
        </ScrollView>
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
