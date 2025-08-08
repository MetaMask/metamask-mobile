import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
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
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Routes from '../../../../../constants/navigation/Routes';
import { selectIsIpfsGatewayEnabled } from '../../../../../selectors/preferencesController';
import { selectTokenList } from '../../../../../selectors/tokenListController';
import {
  getDefaultNetworkByChainId,
  getNetworkImageSource,
} from '../../../../../util/networks';
import { useTheme } from '../../../../../util/theme';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import performance from 'react-native-performance';
import Keypad from '../../../Ramp/Aggregator/components/Keypad';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsLeverageBottomSheet from '../../components/PerpsLeverageBottomSheet';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';
import PerpsSlider from '../../components/PerpsSlider';
import PerpsTokenSelector, {
  type PerpsToken,
} from '../../components/PerpsTokenSelector';
import PerpsTPSLBottomSheet from '../../components/PerpsTPSLBottomSheet';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { measurePerformance } from '../../utils/perpsDebug';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_DECIMALS,
  USDC_NAME,
  USDC_SYMBOL,
} from '../../constants/hyperLiquidConfig';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import type {
  OrderParams,
  OrderType,
  PerpsNavigationParamList,
} from '../../controllers/types';
import {
  formatFeeRate,
  useHasExistingPosition,
  usePerpsAccount,
  usePerpsLiquidationPrice,
  usePerpsMarketData,
  usePerpsOrderExecution,
  usePerpsOrderFees,
  usePerpsOrderForm,
  usePerpsOrderValidation,
  usePerpsPaymentTokens,
  usePerpsPrices,
} from '../../hooks';
import { formatPrice } from '../../utils/formatUtils';
import { calculatePositionSize } from '../../utils/orderCalculations';
import { enhanceTokenWithIcon } from '../../utils/tokenIconUtils';
import createStyles from './PerpsOrderView.styles';

// Navigation params interface
interface OrderRouteParams {
  direction?: 'long' | 'short';
  asset?: string;
  amount?: string;
  leverage?: number;
  // Modal return values
  leverageUpdate?: number;
  orderTypeUpdate?: OrderType;
  tpslUpdate?: {
    takeProfitPrice?: string;
    stopLossPrice?: string;
  };
  limitPriceUpdate?: string;
}

const PerpsOrderView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<RouteProp<{ params: OrderRouteParams }, 'params'>>();
  const { top } = useSafeAreaInsets();
  const toastContext = useContext(ToastContext);

  const toastRef = toastContext?.toastRef;
  const { openTooltipModal } = useTooltipModal();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Ref to access current orderType in callbacks
  const orderTypeRef = useRef<OrderType>('market');

  // Selectors
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  // Get navigation params
  const {
    direction = 'long',
    asset = 'BTC',
    amount: paramAmount,
    leverage: paramLeverage,
  } = route.params || {};

  const cachedAccountState = usePerpsAccount();

  // Get real HyperLiquid USDC balance
  const availableBalance = parseFloat(
    cachedAccountState?.availableBalance?.toString() || '0',
  );

  // Market data hook
  const {
    marketData,
    isLoading: isLoadingMarketData,
    error: marketDataError,
  } = usePerpsMarketData(asset);

  // Order form state management
  const {
    orderForm,
    setAmount,
    setLeverage,
    setTakeProfitPrice,
    setStopLossPrice,
    setLimitPrice,
    handlePercentageAmount,
    handleMaxAmount,
    handleMinAmount,
    calculations,
  } = usePerpsOrderForm({
    initialAsset: asset,
    initialDirection: direction,
    initialAmount: paramAmount,
    initialLeverage: paramLeverage,
  });

  // Order execution using new hook
  const { placeOrder: executeOrder, isPlacing: isPlacingOrder } =
    usePerpsOrderExecution({
      onSuccess: (position) => {
        // Track successful position open
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_EXECUTED)
            .addProperties({
              market: orderForm.asset,
              direction: orderForm.direction,
              orderType: orderTypeRef.current,
              leverage: orderForm.leverage,
              positionSize: position?.size || orderForm.amount,
              entryPrice: position?.entryPrice,
              marginUsed: position?.marginUsed,
            })
            .build(),
        );

        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('perps.order.success.title'),
              isBold: true,
            },
            { label: ' - ', isBold: false },
            {
              label: `${orderForm.direction.toUpperCase()} ${orderForm.asset}`,
              isBold: true,
            },
          ],
          iconName: IconName.CheckBold,
          iconColor: IconColor.Success,
          hasNoTimeout: false,
        });

        if (position) {
          navigation.navigate(Routes.PERPS.POSITION_DETAILS, { position });
        } else {
          navigation.navigate(Routes.PERPS.POSITIONS);
        }
      },
      onError: (error) => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('perps.order.error.placement_failed'),
              isBold: true,
            },
            { label: ': ', isBold: false },
            {
              label: error,
              isBold: false,
            },
          ],
          iconName: IconName.Error,
          iconColor: IconColor.Error,
          hasNoTimeout: true,
          closeButtonOptions: {
            label: strings('perps.order.error.dismiss'),
            variant: ButtonVariants.Secondary,
            onPress: () => toastRef?.current?.closeToast(),
          },
        });
      },
    });
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [selectedPaymentToken, setSelectedPaymentToken] =
    useState<PerpsToken | null>(null);

  // Update ref when orderType changes
  useEffect(() => {
    orderTypeRef.current = orderType;
  }, [orderType]);

  const [isTokenSelectorVisible, setIsTokenSelectorVisible] = useState(false);
  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const [isLeverageVisible, setIsLeverageVisible] = useState(false);
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const paymentTokens = usePerpsPaymentTokens();

  // Check if user has an existing position for this asset
  const { hasPosition: hasExistingPosition } = useHasExistingPosition({
    asset: orderForm.asset,
    loadOnMount: true,
  });

  // Calculate estimated fees using the new hook
  const feeResults = usePerpsOrderFees({
    orderType,
    amount: orderForm.amount,
    isMaker: false, // Conservative estimate for UI display
  });
  const estimatedFees = feeResults.totalFee;

  // Helper function to create tooltip content with "Got it" button
  const createTooltipContent = useCallback(
    (content: React.ReactNode) => (
      <View>
        <View style={styles.tooltipContent}>{content}</View>
        <View style={styles.tooltipButtonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.got_it')}
            onPress={() => {
              // Navigate to the current screen to effectively close the modal
              navigation.navigate(Routes.PERPS.ORDER, route.params || {});
            }}
          />
        </View>
      </View>
    ),
    [navigation, route.params, styles],
  );

  // Tooltip content for educational info
  const tooltipContent = useMemo(
    () => ({
      leverage: createTooltipContent(
        <Text variant={TextVariant.BodyMD}>
          {strings('perps.tooltips.leverage.content')}
        </Text>,
      ),
      liquidationPrice: createTooltipContent(
        <Text variant={TextVariant.BodyMD}>
          {strings('perps.tooltips.liquidation_price.content')}
        </Text>,
      ),
      margin: createTooltipContent(
        <Text variant={TextVariant.BodyMD}>
          {strings('perps.tooltips.margin.content')}
        </Text>,
      ),
      fees: createTooltipContent(
        <View style={styles.tooltipFeesContainer}>
          <View style={styles.tooltipFeeRow}>
            <Text variant={TextVariant.BodyMD}>
              {strings('perps.tooltips.fees.metamask_fee')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatFeeRate(feeResults.metamaskFeeRate)}
            </Text>
          </View>
          <View style={styles.tooltipFeeRow}>
            <Text variant={TextVariant.BodyMD}>
              {strings('perps.tooltips.fees.provider_fee')}
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {formatFeeRate(feeResults.protocolFeeRate)}
            </Text>
          </View>
        </View>,
      ),
    }),
    [
      createTooltipContent,
      feeResults.metamaskFeeRate,
      feeResults.protocolFeeRate,
      styles,
    ],
  );

  // Set initial selected token to Hyperliquid USDC (always first in array)
  useEffect(() => {
    if (!selectedPaymentToken && paymentTokens.length > 0) {
      setSelectedPaymentToken(paymentTokens[0]);
    }
  }, [paymentTokens, selectedPaymentToken]);

  // Track screen load - only on mount/unmount
  const screenLoadStartRef = useRef<number>(performance.now());
  useEffect(() => {
    trace({
      name: TraceName.PerpsOrderView,
      op: TraceOperation.UIStartup,
      tags: {
        screen: 'perps_order_view',
        market: asset,
        direction,
        orderType,
      },
    });
  }, [asset, direction, orderType]);

  // Track balance display updates
  useEffect(() => {
    if (cachedAccountState?.availableBalance !== undefined) {
      const balanceUpdateStart = performance.now();
      measurePerformance(
        PerpsMeasurementName.ASSET_BALANCES_DISPLAYED_UPDATED,
        balanceUpdateStart,
      );
    }
  }, [cachedAccountState?.availableBalance]);

  // Clean up trace on unmount
  useEffect(
    () => () => {
      endTrace({
        name: TraceName.PerpsOrderView,
      });
    },
    [],
  );

  // Track dashboard view event separately with proper dependencies
  useEffect(() => {
    const eventProps = {
      [PerpsEventProperties.TIMESTAMP]: Date.now(),
      [PerpsEventProperties.ASSET]: asset,
      [PerpsEventProperties.DIRECTION]:
        direction === 'long'
          ? PerpsEventValues.DIRECTION.LONG
          : PerpsEventValues.DIRECTION.SHORT,
    };

    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_TRADING_SCREEN_VIEWED)
        .addProperties(eventProps)
        .build(),
    );
  }, [asset, direction, createEventBuilder, trackEvent]);

  // Note: Navigation params for order type modal are no longer needed

  // Memoize the asset array
  const assetSymbols = useMemo(() => [orderForm.asset], [orderForm.asset]);

  // Get real-time price data from HyperLiquid
  // - price: Mid price (average of best bid and ask)
  // - bestBid: Highest price buyers are willing to pay
  // - bestAsk: Lowest price sellers are willing to accept
  // - spread: Difference between ask and bid
  // - includeOrderBook: When true, fetches bid/ask data for limit orders
  const priceData = usePerpsPrices(assetSymbols, orderType === 'limit');
  const currentPrice = priceData[orderForm.asset];
  const assetData = useMemo(() => {
    if (!currentPrice) {
      return { price: 0, change: 0 };
    }
    const price = parseFloat(currentPrice.price || '0');
    const change = parseFloat(currentPrice.percentChange24h || '0');
    return {
      price: isNaN(price) ? 0 : price, // Mid price used for display
      change: isNaN(change) ? 0 : change,
    };
  }, [currentPrice]);

  // Enhanced USDC token for Pay with
  const enhancedUsdcToken = useMemo(() => {
    if (!tokenList) return null;

    return enhanceTokenWithIcon({
      token: {
        symbol: USDC_SYMBOL,
        address: USDC_ARBITRUM_MAINNET_ADDRESS,
        decimals: USDC_DECIMALS,
        chainId: `0x${parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10).toString(16)}`,
        name: USDC_NAME,
      },
      tokenList,
      isIpfsGatewayEnabled,
    });
  }, [tokenList, isIpfsGatewayEnabled]);

  // Track screen load time when data is ready
  useEffect(() => {
    if (currentPrice && cachedAccountState) {
      measurePerformance(
        PerpsMeasurementName.TRADE_SCREEN_LOADED,
        screenLoadStartRef.current,
      );
    }
  }, [currentPrice, cachedAccountState]);

  // Track order input viewed
  useEffect(() => {
    if (orderForm.amount && parseFloat(orderForm.amount) > 0) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_ORDER_TYPE_VIEWED)
          .addProperties({
            [PerpsEventProperties.TIMESTAMP]: Date.now(),
            [PerpsEventProperties.ASSET]: orderForm.asset,
            [PerpsEventProperties.DIRECTION]:
              orderForm.direction === 'long'
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ORDER_SIZE]: parseFloat(orderForm.amount),
            [PerpsEventProperties.LEVERAGE_USED]: orderForm.leverage,
            [PerpsEventProperties.ORDER_TYPE]: orderType,
          })
          .build(),
      );
    }
  }, [
    orderForm.direction,
    orderForm.amount,
    orderForm.leverage,
    orderForm.asset,
    orderType,
    trackEvent,
    createEventBuilder,
  ]);

  // Show error toast if market data is not available
  useEffect(() => {
    if (marketDataError) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('perps.order.error.invalid_asset'), isBold: true },
          { label: ': ', isBold: false },
          {
            label: strings('perps.order.error.asset_not_tradable', { asset }),
            isBold: false,
          },
        ],
        iconName: IconName.Error,
        iconColor: IconColor.Error,
        hasNoTimeout: true,
        closeButtonOptions: {
          label: strings('perps.order.error.go_back'),
          variant: ButtonVariants.Secondary,
          onPress: () => {
            toastRef?.current?.closeToast();
            navigation.goBack();
          },
        },
      });
    }
  }, [marketDataError, asset, toastRef, navigation]);

  // Real-time position size calculation
  const positionSize = useMemo(
    () =>
      calculatePositionSize({
        amount: orderForm.amount,
        price: assetData.price,
        szDecimals: marketData?.szDecimals,
      }),
    [orderForm.amount, assetData.price, marketData?.szDecimals],
  );

  // Get margin required from form calculations
  const marginRequired = calculations.marginRequired;

  // Memoize liquidation price params to prevent infinite recalculation
  const liquidationPriceParams = useMemo(
    () => ({
      entryPrice: assetData.price,
      leverage: orderForm.leverage,
      direction: orderForm.direction,
      asset: orderForm.asset,
    }),
    [assetData.price, orderForm.leverage, orderForm.direction, orderForm.asset],
  );

  // Real-time liquidation price calculation
  const { liquidationPrice } = usePerpsLiquidationPrice(liquidationPriceParams);

  // Order validation using new hook
  const orderValidation = usePerpsOrderValidation({
    orderForm,
    orderType,
    positionSize,
    assetPrice: assetData.price,
    availableBalance,
    marginRequired,
    selectedPaymentToken,
    hasExistingPosition,
  });

  // Handlers

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      const metricsUpdateStart = performance.now();
      setAmount(value || '0');

      // Measure update dependent metrics
      measurePerformance(
        PerpsMeasurementName.UPDATE_DEPENDENT_METRICS,
        metricsUpdateStart,
      );

      // Track position size entry with proper event properties
      const eventProps = {
        [PerpsEventProperties.TIMESTAMP]: Date.now(),
        [PerpsEventProperties.ASSET]: orderForm.asset,
        [PerpsEventProperties.DIRECTION]:
          orderForm.direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.LEVERAGE]: orderForm.leverage,
        [PerpsEventProperties.ORDER_SIZE]: parseFloat(value) || 0,
        [PerpsEventProperties.MARGIN_USED]: marginRequired,
        [PerpsEventProperties.ORDER_TYPE]:
          orderType === 'market'
            ? PerpsEventValues.ORDER_TYPE.MARKET
            : PerpsEventValues.ORDER_TYPE.LIMIT,
        [PerpsEventProperties.INPUT_METHOD]:
          PerpsEventValues.INPUT_METHOD.KEYBOARD,
      };

      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_ORDER_SIZE_CHANGED)
          .addProperties(eventProps)
          .build(),
      );
    },
    [
      setAmount,
      trackEvent,
      createEventBuilder,
      orderForm.asset,
      orderForm.direction,
      orderForm.leverage,
      orderType,
      marginRequired,
    ],
  );

  const handlePercentagePress = (percentage: number) => {
    handlePercentageAmount(percentage);
  };

  const handleMaxPress = () => {
    handleMaxAmount();
  };

  const handleMinPress = () => {
    handleMinAmount();
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
  };

  const handlePlaceOrder = useCallback(async () => {
    // Track order preview shown
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_ORDER_PREVIEW_SHOWN)
        .addProperties({
          market: orderForm.asset,
          direction: orderForm.direction,
          orderType,
          leverage: orderForm.leverage,
          positionSize,
          marginRequired,
          estimatedFees,
        })
        .build(),
    );

    // Validation errors are shown in the UI
    if (!orderValidation.isValid) {
      const firstError = orderValidation.errors[0];
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('perps.order.validation.failed'), isBold: true },
          { label: ': ', isBold: false },
          { label: firstError, isBold: false },
        ],
        iconName: IconName.Warning,
        iconColor: IconColor.Warning,
        hasNoTimeout: true,
      });

      // Track validation failure as error encountered
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_ERROR_ENCOUNTERED)
          .addProperties({
            market: orderForm.asset,
            direction: orderForm.direction,
            orderType,
            error: firstError,
          })
          .build(),
      );

      return;
    }

    // Track order submit clicked
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_ORDER_SUBMIT_CLICKED)
        .addProperties({
          market: orderForm.asset,
          direction: orderForm.direction,
          orderType,
          leverage: orderForm.leverage,
          positionSize,
          marginRequired,
          paymentToken: selectedPaymentToken?.symbol,
          hasTakeProfit: !!orderForm.takeProfitPrice,
          hasStopLoss: !!orderForm.stopLossPrice,
        })
        .build(),
    );

    // Track trade transaction initiated
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_INITIATED)
        .addProperties({
          [PerpsEventProperties.TIMESTAMP]: Date.now(),
          [PerpsEventProperties.ASSET]: orderForm.asset,
          [PerpsEventProperties.DIRECTION]:
            orderForm.direction === 'long'
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
          [PerpsEventProperties.ORDER_TYPE]: orderType,
          [PerpsEventProperties.LEVERAGE]: orderForm.leverage,
          [PerpsEventProperties.ORDER_SIZE]: positionSize,
          [PerpsEventProperties.MARGIN_USED]: marginRequired,
        })
        .build(),
    );

    // Execute order using the new hook
    const orderParams: OrderParams = {
      coin: orderForm.asset,
      isBuy: orderForm.direction === 'long',
      size: positionSize,
      orderType,
      takeProfitPrice: orderForm.takeProfitPrice,
      stopLossPrice: orderForm.stopLossPrice,
      currentPrice: assetData.price,
      leverage: orderForm.leverage,
      ...(orderType === 'limit' && orderForm.limitPrice
        ? { price: orderForm.limitPrice }
        : {}),
    };

    try {
      // Track trade transaction submitted
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_SUBMITTED)
          .addProperties({
            [PerpsEventProperties.TIMESTAMP]: Date.now(),
            [PerpsEventProperties.ASSET]: orderForm.asset,
            [PerpsEventProperties.DIRECTION]:
              orderForm.direction === 'long'
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ORDER_TYPE]: orderType,
            [PerpsEventProperties.LEVERAGE]: orderForm.leverage,
            [PerpsEventProperties.ORDER_SIZE]: positionSize,
          })
          .build(),
      );

      await executeOrder(orderParams);
    } catch (error) {
      // Track trade transaction failed
      trackEvent(
        createEventBuilder(MetaMetricsEvents.PERPS_TRADE_TRANSACTION_FAILED)
          .addProperties({
            [PerpsEventProperties.TIMESTAMP]: Date.now(),
            [PerpsEventProperties.ASSET]: orderForm.asset,
            [PerpsEventProperties.DIRECTION]:
              orderForm.direction === 'long'
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ERROR_MESSAGE]:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .build(),
      );
      throw error;
    }
  }, [
    orderValidation,
    toastRef,
    orderForm,
    positionSize,
    assetData.price,
    executeOrder,
    orderType,
    trackEvent,
    createEventBuilder,
    marginRequired,
    estimatedFees,
    selectedPaymentToken,
  ]);

  return (
    <SafeAreaView style={[styles.container, { marginTop: top }]}>
      {/* Header */}
      <PerpsOrderHeader
        asset={orderForm.asset}
        price={assetData.price}
        priceChange={assetData.change}
        orderType={orderType}
        onOrderTypePress={() => setIsOrderTypeVisible(true)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <PerpsAmountDisplay
          amount={orderForm.amount}
          maxAmount={availableBalance}
          showWarning={availableBalance === 0}
          onPress={handleAmountPress}
          isActive={isInputFocused}
        />

        {/* Amount Slider - Hide when keypad is active */}
        {!isInputFocused && (
          <View style={styles.sliderSection}>
            <PerpsSlider
              value={parseFloat(orderForm.amount || '0')}
              onValueChange={(value) => setAmount(Math.floor(value).toString())}
              minimumValue={0}
              maximumValue={availableBalance}
              step={1}
              showPercentageLabels
            />
          </View>
        )}

        {/* Order Details */}
        <View style={styles.detailsWrapper}>
          {/* Leverage */}
          <View style={[styles.detailItem, styles.detailItemFirst]}>
            <TouchableOpacity onPress={() => setIsLeverageVisible(true)}>
              <ListItem>
                <ListItemColumn widthType={WidthType.Fill}>
                  <View style={styles.detailLeft}>
                    <Text variant={TextVariant.BodyLGMedium}>
                      {strings('perps.order.leverage')}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        openTooltipModal(
                          strings('perps.tooltips.leverage.title'),
                          tooltipContent.leverage,
                        )
                      }
                      style={styles.infoIcon}
                    >
                      <Icon
                        name={IconName.Info}
                        size={IconSize.Xss}
                        color={IconColor.Muted}
                      />
                    </TouchableOpacity>
                  </View>
                </ListItemColumn>
                <ListItemColumn widthType={WidthType.Auto}>
                  <Text variant={TextVariant.BodyLGMedium}>
                    {isLoadingMarketData ? '...' : `${orderForm.leverage}x`}
                  </Text>
                </ListItemColumn>
              </ListItem>
            </TouchableOpacity>
          </View>

          {/* Limit price - only show for limit orders */}
          {orderType === 'limit' && (
            <View style={styles.detailItem}>
              <TouchableOpacity onPress={() => setIsLimitPriceVisible(true)}>
                <ListItem>
                  <ListItemColumn widthType={WidthType.Fill}>
                    <Text variant={TextVariant.BodyLGMedium}>
                      {strings('perps.order.limit_price')}
                    </Text>
                  </ListItemColumn>
                  <ListItemColumn widthType={WidthType.Auto}>
                    <Text variant={TextVariant.BodyLGMedium}>
                      {orderForm.limitPrice
                        ? formatPrice(orderForm.limitPrice)
                        : 'Set price'}
                    </Text>
                  </ListItemColumn>
                </ListItem>
              </TouchableOpacity>
            </View>
          )}

          {/* Pay with */}
          <View style={styles.detailItem}>
            <TouchableOpacity onPress={() => setIsTokenSelectorVisible(true)}>
              <ListItem>
                <ListItemColumn widthType={WidthType.Fill}>
                  <Text variant={TextVariant.BodyLGMedium}>
                    {strings('perps.deposit.pay_with')}
                  </Text>
                </ListItemColumn>
                <ListItemColumn widthType={WidthType.Auto}>
                  <View style={styles.payWithRight}>
                    <BadgeWrapper
                      badgeElement={
                        <Badge
                          variant={BadgeVariant.Network}
                          imageSource={getNetworkImageSource({
                            chainId:
                              selectedPaymentToken?.chainId ===
                              HYPERLIQUID_TESTNET_CHAIN_ID
                                ? HYPERLIQUID_MAINNET_CHAIN_ID // Use mainnet image for testnet
                                : selectedPaymentToken?.chainId ||
                                  HYPERLIQUID_MAINNET_CHAIN_ID,
                          })}
                          name={
                            selectedPaymentToken?.chainId ===
                              HYPERLIQUID_MAINNET_CHAIN_ID ||
                            selectedPaymentToken?.chainId ===
                              HYPERLIQUID_TESTNET_CHAIN_ID
                              ? strings('perps.network.hyperliquid')
                              : (() => {
                                  const network = getDefaultNetworkByChainId(
                                    String(selectedPaymentToken?.chainId),
                                  ) as { name: string } | undefined;
                                  return (
                                    network?.name ||
                                    strings('perps.network.hyperliquid')
                                  );
                                })()
                          }
                        />
                      }
                      badgePosition={BadgePosition.BottomRight}
                    >
                      <AvatarToken
                        name={selectedPaymentToken?.symbol || 'USDC'}
                        imageSource={
                          selectedPaymentToken?.image ||
                          enhancedUsdcToken?.image
                            ? {
                                uri:
                                  selectedPaymentToken?.image ||
                                  enhancedUsdcToken?.image,
                              }
                            : undefined
                        }
                        size={AvatarSize.Md}
                      />
                    </BadgeWrapper>
                    <Text
                      variant={TextVariant.BodyLGMedium}
                      style={styles.payWithText}
                    >
                      {selectedPaymentToken?.symbol || 'USDC'}
                    </Text>
                  </View>
                </ListItemColumn>
              </ListItem>
            </TouchableOpacity>
          </View>

          {/* Take profit */}
          <View style={styles.detailItem}>
            <TouchableOpacity onPress={() => setIsTPSLVisible(true)}>
              <ListItem>
                <ListItemColumn widthType={WidthType.Fill}>
                  <Text variant={TextVariant.BodyLGMedium}>
                    {strings('perps.order.take_profit')}
                  </Text>
                </ListItemColumn>
                <ListItemColumn widthType={WidthType.Auto}>
                  <Text variant={TextVariant.BodyLGMedium}>
                    {orderForm.takeProfitPrice
                      ? formatPrice(orderForm.takeProfitPrice)
                      : strings('perps.order.off')}
                  </Text>
                </ListItemColumn>
              </ListItem>
            </TouchableOpacity>
          </View>

          {/* Stop loss */}
          <View style={[styles.detailItem, styles.detailItemLast]}>
            <TouchableOpacity onPress={() => setIsTPSLVisible(true)}>
              <ListItem>
                <ListItemColumn widthType={WidthType.Fill}>
                  <Text variant={TextVariant.BodyLGMedium}>
                    {strings('perps.order.stop_loss')}
                  </Text>
                </ListItemColumn>
                <ListItemColumn widthType={WidthType.Auto}>
                  <Text variant={TextVariant.BodyLGMedium}>
                    {orderForm.stopLossPrice
                      ? formatPrice(orderForm.stopLossPrice)
                      : strings('perps.order.off')}
                  </Text>
                </ListItemColumn>
              </ListItem>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.margin')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  openTooltipModal(
                    strings('perps.tooltips.margin.title'),
                    tooltipContent.margin,
                  )
                }
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Xss}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {marginRequired ? formatPrice(marginRequired) : '--'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.liquidation_price')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  openTooltipModal(
                    strings('perps.tooltips.liquidation_price.title'),
                    tooltipContent.liquidationPrice,
                  )
                }
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Xss}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {parseFloat(orderForm.amount) > 0
                ? formatPrice(liquidationPrice)
                : '--'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.fees')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  openTooltipModal(
                    strings('perps.tooltips.fees.title'),
                    tooltipContent.fees,
                  )
                }
                style={styles.infoIcon}
              >
                <Icon
                  name={IconName.Info}
                  size={IconSize.Xss}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            </View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {parseFloat(orderForm.amount) > 0
                ? formatPrice(estimatedFees)
                : '--'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Keypad Section - Show when input is focused */}
      {isInputFocused && (
        <View style={styles.bottomSection}>
          <View style={styles.percentageButtonsContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="25%"
              onPress={() => handlePercentagePress(0.25)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="50%"
              onPress={() => handlePercentagePress(0.5)}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="75%"
              onPress={() => handlePercentagePress(0.75)}
              style={styles.percentageButton}
            />
          </View>

          <View style={styles.percentageButtonsContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label="Min"
              onPress={handleMinPress}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.max_button')}
              onPress={handleMaxPress}
              style={styles.percentageButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Md}
              label={strings('perps.deposit.done_button')}
              onPress={handleDonePress}
              style={styles.percentageButton}
            />
          </View>

          <Keypad
            style={styles.keypad}
            value={orderForm.amount}
            onChange={handleKeypadChange}
            currency="USD"
            decimals={0}
          />
        </View>
      )}

      {/* Fixed Place Order Button - Hide when keypad is active */}
      {!isInputFocused && (
        <View style={styles.fixedBottomContainer}>
          {orderValidation.errors.length > 0 && (
            <View style={styles.validationContainer}>
              {orderValidation.errors.map((error) => (
                <Text
                  key={error}
                  variant={TextVariant.BodySM}
                  color={TextColor.Error}
                >
                  {error}
                </Text>
              ))}
            </View>
          )}
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings(
              orderForm.direction === 'long'
                ? 'perps.order.button.long'
                : 'perps.order.button.short',
              { asset: orderForm.asset },
            )}
            onPress={handlePlaceOrder}
            disabled={
              !orderValidation.isValid ||
              isPlacingOrder ||
              orderValidation.isValidating
            }
            loading={isPlacingOrder}
          />
        </View>
      )}

      {/* Token Selector */}
      <PerpsTokenSelector
        isVisible={isTokenSelectorVisible}
        onClose={() => setIsTokenSelectorVisible(false)}
        onTokenSelect={(token) => {
          setSelectedPaymentToken(token);
          setIsTokenSelectorVisible(false);

          // Track payment token selected
          trackEvent(
            createEventBuilder(MetaMetricsEvents.PERPS_PAYMENT_TOKEN_SELECTED)
              .addProperties({
                market: orderForm.asset,
                direction: orderForm.direction,
                orderType,
                paymentToken: token.symbol,
                paymentChain: token.chainId,
                previousToken: selectedPaymentToken?.symbol,
              })
              .build(),
          );
        }}
        tokens={paymentTokens}
        selectedTokenAddress={selectedPaymentToken?.address || ''}
        selectedTokenChainId={
          selectedPaymentToken?.chainId || HYPERLIQUID_MAINNET_CHAIN_ID
        }
        title={strings('perps.order.select_payment_asset')}
        minimumBalance={0}
      />

      {/* TP/SL Bottom Sheet */}
      <PerpsTPSLBottomSheet
        isVisible={isTPSLVisible}
        onClose={() => setIsTPSLVisible(false)}
        onConfirm={(takeProfitPrice, stopLossPrice) => {
          setTakeProfitPrice(takeProfitPrice);
          setStopLossPrice(stopLossPrice);
          setIsTPSLVisible(false);

          // TP/SL set events are tracked in the bottom sheet component
        }}
        asset={orderForm.asset}
        currentPrice={assetData.price}
        direction={orderForm.direction}
        initialTakeProfitPrice={orderForm.takeProfitPrice}
        initialStopLossPrice={orderForm.stopLossPrice}
      />

      {/* Leverage Selector */}
      <PerpsLeverageBottomSheet
        isVisible={isLeverageVisible}
        onClose={() => setIsLeverageVisible(false)}
        onConfirm={(leverage) => {
          setLeverage(leverage);
          setIsLeverageVisible(false);

          // Track leverage change
          trackEvent(
            createEventBuilder(MetaMetricsEvents.PERPS_LEVERAGE_CHANGED)
              .addProperties({
                market: orderForm.asset,
                direction: orderForm.direction,
                newLeverage: leverage,
                previousLeverage: orderForm.leverage,
              })
              .build(),
          );
        }}
        leverage={orderForm.leverage}
        minLeverage={1}
        maxLeverage={
          marketData?.maxLeverage || PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE
        }
        currentPrice={assetData.price}
        liquidationPrice={parseFloat(liquidationPrice)}
        direction={orderForm.direction}
        asset={orderForm.asset}
      />

      {/* Limit Price Bottom Sheet */}
      <PerpsLimitPriceBottomSheet
        isVisible={isLimitPriceVisible}
        onClose={() => setIsLimitPriceVisible(false)}
        onConfirm={(limitPrice) => {
          setLimitPrice(limitPrice);
          setIsLimitPriceVisible(false);
        }}
        asset={orderForm.asset}
        limitPrice={orderForm.limitPrice}
        currentPrice={assetData.price}
      />

      {/* Order Type Bottom Sheet */}
      <PerpsOrderTypeBottomSheet
        isVisible={isOrderTypeVisible}
        onClose={() => setIsOrderTypeVisible(false)}
        onSelect={(type) => {
          setOrderType(type);
          // Clear limit price when switching to market order
          if (type === 'market') {
            setLimitPrice(undefined);
          }
          setIsOrderTypeVisible(false);

          // Track order type change
          trackEvent(
            createEventBuilder(MetaMetricsEvents.PERPS_ORDER_TYPE_CHANGED)
              .addProperties({
                market: orderForm.asset,
                direction: orderForm.direction,
                newOrderType: type,
                previousOrderType: orderType,
              })
              .build(),
          );
        }}
        currentOrderType={orderType}
      />
    </SafeAreaView>
  );
};

export default PerpsOrderView;
