import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
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
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import type { PerpsNavigationParamList } from '../../controllers/types';
import {
  usePerpsAccount,
  usePerpsConnection,
  usePerpsEventTracking,
  usePerpsFirstTimeUser,
  usePerpsTrading,
  usePerpsPerformance,
  usePerpsLivePositions,
} from '../../hooks';
import { usePerpsLiveAccount, usePerpsLiveOrders } from '../../hooks/stream';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import PerpsCard from '../../components/PerpsCard';
import styleSheet from './PerpsTabView.styles';
import {
  PerpsTabViewSelectorsIDs,
  PerpsPositionsViewSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { selectPerpsEligibility } from '../../selectors/perpsController';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Engine from '../../../../../core/Engine';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { formatPerpsFiat } from '../../utils/formatUtils';
import { toHumanDuration } from '../../../../Views/confirmations/utils/time';
import { RootState } from '../../../../../reducers';
import { selectTransactionBridgeQuotesById } from '../../../../../core/redux/slices/confirmationMetrics';

interface PerpsTabViewProps {}

const PerpsTabView: React.FC<PerpsTabViewProps> = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);

  const { account: liveAccount } = usePerpsLiveAccount({ throttleMs: 1000 });
  const [isExpectingDeposit, setIsExpectingDeposit] = useState(false);
  const previousBalanceRef = useRef<string | null>(null);

  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const selectedEvmAccount = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  );
  const { getAccountState } = usePerpsTrading();
  const { isConnected, isInitialized } = usePerpsConnection();
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

  const { toastRef } = useContext(ToastContext);

  // Get the internal transaction ID from the controller. Needed to get bridge quotes.
  const lastDepositTransactionId = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.lastDepositTransactionId ??
      null,
  );

  // For Perps deposits this array typically contains only one element.
  const bridgeQuotes = useSelector((state: RootState) =>
    selectTransactionBridgeQuotesById(state, lastDepositTransactionId ?? ''),
  );

  const showDepositInProgressToast = useCallback(() => {
    const processingTimeSeconds =
      bridgeQuotes?.[0]?.estimatedProcessingTimeInSeconds;

    let processingMessage = strings(
      'perps.deposit.funds_available_momentarily',
    );

    if (processingTimeSeconds && processingTimeSeconds > 0) {
      const formattedProcessingTime = toHumanDuration(processingTimeSeconds);
      processingMessage = strings('perps.deposit.estimated_processing_time', {
        time: formattedProcessingTime,
      });
    }

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.CheckBold,
      iconColor: theme.colors.icon.default,
      backgroundColor: theme.colors.primary.default,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('perps.deposit.in_progress'),
          isBold: true,
        },
        {
          label: '\n',
        },
        {
          label: processingMessage,
          isBold: false,
        },
      ],
    });
  }, [
    bridgeQuotes,
    theme.colors.icon.default,
    theme.colors.primary.default,
    toastRef,
  ]);

  const showDepositSuccessToast = useCallback(
    (amount: string) => {
      const amountFormatted = formatPerpsFiat(amount);

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: theme.colors.icon.default,
        backgroundColor: theme.colors.primary.default,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('perps.deposit.success_toast'),
            isBold: true,
          },
          {
            label: '\n',
          },
          {
            label: strings('perps.deposit.success_message', {
              amount: amountFormatted,
            }),
            isBold: false,
          },
        ],
      });
    },
    [theme.colors.icon.default, theme.colors.primary.default, toastRef],
  );

  const isEligible = useSelector(selectPerpsEligibility);

  const { isFirstTimeUser } = usePerpsFirstTimeUser();

  const firstTimeUserIconSize = 48 as unknown as IconSize;

  const hasPositions = positions && positions.length > 0;
  const hasOrders = orders && orders.length > 0;
  const hasNoPositionsOrOrders = !hasPositions && !hasOrders;

  // Listen for transaction submission
  useEffect(() => {
    const handleTransactionSubmitted = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (transactionMeta.type === TransactionType.perpsDeposit) {
        showDepositInProgressToast();
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionSubmitted',
      handleTransactionSubmitted,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionSubmitted',
        handleTransactionSubmitted,
      );
    };
  }, [showDepositInProgressToast]);

  // Listen for deposit transaction confirmations
  useEffect(() => {
    const handleTransactionConfirmed = (transactionMeta: TransactionMeta) => {
      if (transactionMeta.type === TransactionType.perpsDeposit) {
        setIsExpectingDeposit(true);
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      handleTransactionConfirmed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleTransactionConfirmed,
      );
    };
  }, []);

  // Watch live account balance for deposit credits
  useEffect(() => {
    // Initialize previous balance
    if (previousBalanceRef.current === null && liveAccount?.availableBalance) {
      previousBalanceRef.current = liveAccount.availableBalance;
      return;
    }

    // Check for balance increase
    if (
      isExpectingDeposit &&
      liveAccount?.availableBalance &&
      previousBalanceRef.current &&
      parseFloat(liveAccount.availableBalance) >
        parseFloat(previousBalanceRef.current)
    ) {
      showDepositSuccessToast(liveAccount.availableBalance);
      setIsExpectingDeposit(false);
    }

    // Always update the ref
    if (liveAccount?.availableBalance) {
      previousBalanceRef.current = liveAccount.availableBalance;
    }
  }, [
    isExpectingDeposit,
    liveAccount?.availableBalance,
    showDepositSuccessToast,
  ]);

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
      return (
        <View style={styles.loadingContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings('perps.position.list.loading')}
          </Text>
        </View>
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
        <Button
          variant={ButtonVariants.Primary}
          onPress={showDepositInProgressToast}
          label="Show Deposit In Progress Toast"
        />
        <Button
          variant={ButtonVariants.Primary}
          onPress={() =>
            showDepositSuccessToast(liveAccount?.availableBalance ?? '')
          }
          label="Show Success Toast"
        />
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
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
                  color={TextColor.Muted}
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
        </ScrollView>
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
