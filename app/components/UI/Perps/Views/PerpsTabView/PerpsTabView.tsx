import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
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
import type {
  PerpsNavigationParamList,
  Order,
  Position,
} from '../../controllers/types';
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
import { usePerpsAssetMetadata } from '../../hooks/usePerpsAssetsMetadata';
import RemoteImage from '../../../../Base/RemoteImage';
import { formatPrice, formatPnl } from '../../utils/formatUtils';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import styleSheet from './PerpsTabView.styles';

interface PerpsTabViewProps {}

// Unified card component for displaying positions and orders
const PerpsCard: React.FC<{
  position?: Position;
  order?: Order;
  onPress?: () => void;
}> = ({ position, order, onPress }) => {
  const { styles } = useStyles(styleSheet, {});

  // Determine which type of data we have
  const symbol = position?.coin || order?.symbol || '';
  const { assetUrl } = usePerpsAssetMetadata(symbol);

  // Calculate display values
  let primaryText = '';
  let secondaryText = '';
  let valueText = '';
  let labelText = '';

  if (position) {
    const leverage = position.leverage.value;
    const isLong = parseFloat(position.size) > 0;
    primaryText = `${position.coin} ${leverage}x ${isLong ? 'long' : 'short'}`;
    secondaryText = `${Math.abs(parseFloat(position.size))} ${position.coin}`;

    // Calculate PnL display
    const pnlValue = parseFloat(position.unrealizedPnl);
    const pnlColor = pnlValue >= 0 ? TextColor.Success : TextColor.Error;
    valueText = formatPnl(pnlValue); // formatPnl handles the sign display
    const roeValue = parseFloat(position.returnOnEquity);
    labelText = `${roeValue >= 0 ? '+' : ''}${roeValue.toFixed(2)}%`; // Show ROE as percentage

    return (
      <TouchableOpacity
        style={styles.positionCard}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.positionCardContent}>
          {/* Left side: Icon and info */}
          <View style={styles.positionLeft}>
            {assetUrl && (
              <RemoteImage
                source={{ uri: assetUrl }}
                style={styles.assetIcon}
              />
            )}
            <View style={styles.positionInfo}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
              >
                {primaryText}
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
                {secondaryText}
              </Text>
            </View>
          </View>

          {/* Right side: Value and label */}
          <View style={styles.positionRight}>
            <Text variant={TextVariant.BodyMDMedium} color={pnlColor}>
              {valueText}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {labelText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  } else if (order) {
    const leverage = 10; // Default leverage for orders
    primaryText = `${order.symbol} ${leverage}x ${
      order.side === 'buy' ? 'long' : 'short'
    }`;
    secondaryText = `${order.originalSize} ${order.symbol}`;
    const orderValue = parseFloat(order.originalSize) * parseFloat(order.price);
    valueText = formatPrice(orderValue);
    labelText = strings('perps.order.limit');

    return (
      <TouchableOpacity
        style={styles.positionCard}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.positionCardContent}>
          {/* Left side: Icon and info */}
          <View style={styles.positionLeft}>
            {assetUrl && (
              <RemoteImage
                source={{ uri: assetUrl }}
                style={styles.assetIcon}
              />
            )}
            <View style={styles.positionInfo}>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
              >
                {primaryText}
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
                {secondaryText}
              </Text>
            </View>
          </View>

          {/* Right side: Value and label */}
          <View style={styles.positionRight}>
            <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {valueText}
            </Text>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {labelText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return null;
};

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
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

  // TAT-1400: Get live orders excluding TP/SL orders
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
            <PerpsCard
              key={order.orderId}
              order={order}
              onPress={() => {
                // Navigate to order details if needed
              }}
            />
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
            <PerpsCard
              key={`${position.coin}-${index}`}
              position={position}
              onPress={() => {
                // Navigate to position details if needed
              }}
            />
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
