import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
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
import { PerpsTabControlBar } from '../../components/PerpsTabControlBar';
import PerpsErrorState, {
  PerpsErrorType,
} from '../../components/PerpsErrorState';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsEventTracking,
  usePerpsFirstTimeUser,
  usePerpsTrading,
  usePerpsPerformance,
  usePerpsLivePositions,
} from '../../hooks';
import { usePerpsLiveOrders } from '../../hooks/stream';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import PerpsCard from '../../components/PerpsCard';
import styleSheet from './PerpsTabView.styles';

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const selectedEvmAccount = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  );
  const { getAccountState } = usePerpsTrading();
  const { isConnected, isInitialized, error, connect, resetError } =
    usePerpsConnection();
  const { track } = usePerpsEventTracking();
  const cachedAccountState = usePerpsAccount();

  const hasTrackedHomescreen = useRef(false);
  const { startMeasure, endMeasure } = usePerpsPerformance();

  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000, // Update positions every second
  });

  const orders = usePerpsLiveOrders({
    hideTpSl: true, // Filter out TP/SL orders
    throttleMs: 1000, // Update orders every second
  });

  const { isFirstTimeUser } = usePerpsFirstTimeUser();

  const firstTimeUserIconSize = 48 as unknown as IconSize;

  // Start measuring position data load time on mount
  useEffect(() => {
    startMeasure(PerpsMeasurementName.POSITION_DATA_LOADED_PERP_TAB);
  }, [startMeasure]);

  // Automatically load account state on mount and when network or account changes
  useEffect(() => {
    // Only load account state if we're connected, initialized, and have an EVM account
    if (isConnected && isInitialized && selectedEvmAccount) {
      // Fire and forget - errors are already handled in getAccountState
      // and stored in the controller's state
      getAccountState();
    }
  }, [getAccountState, isConnected, isInitialized, selectedEvmAccount]);

  // Track homescreen tab viewed - only once when positions and account are loaded
  useEffect(() => {
    if (
      !hasTrackedHomescreen.current &&
      !isInitialLoading &&
      positions &&
      cachedAccountState?.totalBalance !== undefined
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
        [PerpsEventProperties.PERP_ACCOUNT_BALANCE]: parseFloat(
          cachedAccountState.totalBalance,
        ),
      });

      hasTrackedHomescreen.current = true;
    }
  }, [
    isInitialLoading,
    positions,
    cachedAccountState?.totalBalance,
    track,
    endMeasure,
  ]);

  const handleManageBalancePress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.BALANCE_MODAL,
    });
  }, [navigation]);

  const handleStartTrading = useCallback(() => {
    // Navigate to tutorial carousel for first-time users
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.TUTORIAL,
    });
  }, [navigation]);

  const handleRetryConnection = useCallback(() => {
    resetError();
    connect();
  }, [connect, resetError]);

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
        </View>
      </>
    );
  };

  const renderPositionsSection = () => {
    if (isInitialLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings('perps.position.list.loading')}
          </Text>
        </View>
      );
    }

    if (isFirstTimeUser) {
      return (
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
            color={TextColor.Muted}
            style={styles.firstTimeDescription}
          >
            {strings('perps.position.list.first_time_description')}
          </Text>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={strings('perps.position.list.start_trading')}
            onPress={handleStartTrading}
            style={styles.startTradingButton}
            width={ButtonWidthTypes.Full}
          />
        </View>
      );
    }

    if (positions.length === 0) {
      // Regular empty state for returning users
      return (
        <View style={styles.emptyContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('perps.position.list.empty_title')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.emptyText}
          >
            {strings('perps.position.list.empty_description')}
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text variant={TextVariant.BodyMDMedium} style={styles.sectionTitle}>
            {strings('perps.position.title')}
          </Text>
        </View>
        <View>
          {positions.map((position, index) => (
            <PerpsCard key={`${position.coin}-${index}`} position={position} />
          ))}
        </View>
      </>
    );
  };

  // Check for connection errors
  if (error && !isConnected && selectedEvmAccount) {
    return (
      <View style={styles.wrapper}>
        <PerpsErrorState
          errorType={PerpsErrorType.CONNECTION_FAILED}
          onRetry={handleRetryConnection}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper} edges={['bottom', 'left', 'right']}>
      {isFirstTimeUser ? (
        <View style={[styles.content, styles.firstTimeContent]}>
          <View style={styles.section}>{renderPositionsSection()}</View>
        </View>
      ) : (
        <>
          <PerpsTabControlBar onManageBalancePress={handleManageBalancePress} />
          <ScrollView style={styles.content}>
            <View style={styles.section}>{renderPositionsSection()}</View>
            <View style={styles.section}>{renderOrdersSection()}</View>
          </ScrollView>
        </>
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
