import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  PerpsPositionsViewSelectorsIDs,
  PerpsTabViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
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

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
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

  const firstTimeUserIconSize = 48 as unknown as IconSize;

  const hasPositions = positions && positions.length > 0;
  const hasOrders = orders && orders.length > 0;
  const hasNoPositionsOrOrders = !hasPositions && !hasOrders;

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
            <PerpsCard key={order.orderId} order={order} />
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
            const sizeValue = parseFloat(position.size);
            const directionSegment = Number.isFinite(sizeValue)
              ? sizeValue > 0
                ? 'long'
                : sizeValue < 0
                ? 'short'
                : 'unknown'
              : 'unknown';
            return (
              <View
                key={`${position.coin}-${index}`}
                testID={`${PerpsPositionsViewSelectorsIDs.POSITION_ITEM}-${position.coin}-${position.leverage.value}x-${directionSegment}-${index}`}
              >
                <PerpsCard
                  key={`${position.coin}-${index}`}
                  position={position}
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
        <View style={styles.content}>
          <View style={styles.contentContainer}>
            {!isInitialLoading && hasNoPositionsOrOrders ? (
              <View style={styles.firstTimeContent}>
                <View style={styles.firstTimeContainer}>
                  <Icon
                    name={IconName.Details}
                    color={IconColor.Muted}
                    size={firstTimeUserIconSize}
                    style={styles.firstTimeIcon}
                  />
                  <Text
                    variant={TextVariant.HeadingMD}
                    color={TextColor.Default}
                    style={styles.firstTimeTitle}
                  >
                    {strings('perps.position.list.first_time_title')}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                    style={styles.firstTimeDescription}
                  >
                    {strings('perps.position.list.first_time_description')}
                  </Text>
                  <Button
                    variant={ButtonVariants.Primary}
                    size={ButtonSize.Lg}
                    label={strings('perps.position.list.start_trading')}
                    onPress={handleNewTrade}
                    style={styles.startTradingButton}
                    width={ButtonWidthTypes.Full}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.tradeInfoContainer}>
                <View style={styles.section}>{renderPositionsSection()}</View>
                <View style={styles.section}>{renderOrdersSection()}</View>
              </View>
            )}
          </View>
        </View>
        {isEligibilityModalVisible && (
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={() => setIsEligibilityModalVisible(false)}
              contentKey={'geo_block'}
              testID={PerpsTabViewSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP}
            />
          </Modal>
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
