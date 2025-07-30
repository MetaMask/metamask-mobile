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
} from 'react';
import { SafeAreaView, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
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
import Keypad from '../../../Ramp/Aggregator/components/Keypad';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
  TRADING_DEFAULTS,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_DECIMALS,
  USDC_NAME,
  USDC_SYMBOL,
} from '../../constants/hyperLiquidConfig';
import type {
  PerpsNavigationParamList,
  OrderType,
  OrderParams,
} from '../../controllers/types';
import {
  usePerpsAccount,
  usePerpsNetwork,
  usePerpsPaymentTokens,
  usePerpsPrices,
  usePerpsTrading,
  usePerpsMarketData,
  usePerpsLiquidationPrice,
} from '../../hooks';
import { formatPrice } from '../../utils/formatUtils';
import {
  calculateEstimatedFees,
  calculateMarginRequired,
  calculatePositionSize,
} from '../../utils/orderCalculations';
import {
  validatePerpsOrder,
  type OrderFormState,
} from '../../utils/orderValidation';
import { enhanceTokenWithIcon } from '../../utils/tokenIconUtils';
import createStyles from './PerpsOrderView.styles';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

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

  // Get PerpsController methods and state
  const { placeOrder, getPositions } = usePerpsTrading();
  const currentNetwork = usePerpsNetwork();
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

  // Order form state
  const defaultAmount =
    currentNetwork === 'mainnet'
      ? TRADING_DEFAULTS.amount.mainnet
      : TRADING_DEFAULTS.amount.testnet;
  const initialMarginRequired = defaultAmount / TRADING_DEFAULTS.leverage;
  const initialBalancePercent =
    availableBalance > 0
      ? Math.min((initialMarginRequired / availableBalance) * 100, 100)
      : TRADING_DEFAULTS.marginPercent;

  const defaultAmountValue =
    paramAmount ||
    (currentNetwork === 'mainnet'
      ? TRADING_DEFAULTS.amount.mainnet.toString()
      : TRADING_DEFAULTS.amount.testnet.toString());
  const defaultLeverageValue = paramLeverage || TRADING_DEFAULTS.leverage;

  const [orderForm, setOrderForm] = useState<OrderFormState>({
    asset,
    direction,
    amount: defaultAmountValue,
    leverage: defaultLeverageValue,
    balancePercent: Math.round(initialBalancePercent * 100) / 100,
    takeProfitPrice: undefined,
    stopLossPrice: undefined,
    limitPrice: undefined,
  });

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [selectedPaymentToken, setSelectedPaymentToken] =
    useState<PerpsToken | null>(null);

  const [isTokenSelectorVisible, setIsTokenSelectorVisible] = useState(false);
  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const [isLeverageVisible, setIsLeverageVisible] = useState(false);
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const paymentTokens = usePerpsPaymentTokens();

  // Tooltip content for educational info
  const tooltipContent = {
    leverage: (
      <View>
        <Text variant={TextVariant.BodyMD}>
          Leverage allows you to control a larger position with less capital,
          amplifying both profits and losses.
        </Text>
        <View style={styles.tooltipSection}>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Higher leverage = Higher risk & reward
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Maximum leverage varies by asset
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Liquidation occurs when losses exceed margin
          </Text>
          <Text variant={TextVariant.BodyMD}>
            • Start with lower leverage if you&apos;re new
          </Text>
        </View>
      </View>
    ),
    executionTime: (
      <View>
        <Text variant={TextVariant.BodyMD}>
          Orders are executed nearly instantly on HyperLiquid&apos;s
          high-performance blockchain.
        </Text>
        <View style={styles.tooltipSection}>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Market orders: &lt; 1 second
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Limit orders: Execute when price is matched
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Network congestion may cause slight delays
          </Text>
          <Text variant={TextVariant.BodyMD}>
            • Failed orders are automatically retried
          </Text>
        </View>
      </View>
    ),
    margin: (
      <View>
        <Text variant={TextVariant.BodyMD}>
          Margin is the collateral required to open and maintain a leveraged
          position.
        </Text>
        <View style={styles.tooltipSection}>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Initial margin = Position size ÷ Leverage
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Maintenance margin varies by asset (1.25% to 16.7%)
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Available balance must exceed initial margin
          </Text>
          <Text variant={TextVariant.BodyMD}>
            • Margin is locked when position is open
          </Text>
        </View>
      </View>
    ),
    fees: (
      <View>
        <Text variant={TextVariant.BodyMD}>
          Fees are charged on every trade to cover the cost of execution and
          liquidity provision.
        </Text>
        <View style={styles.tooltipSection}>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Market orders: 0.075% of position size
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Limit orders: 0.02% of position size
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Fees are deducted from your margin balance
          </Text>
          <Text variant={TextVariant.BodyMD}>
            • No funding fees for the first 8 hours
          </Text>
        </View>
      </View>
    ),
  };

  // Set initial selected token to Hyperliquid USDC (always first in array)
  useEffect(() => {
    if (!selectedPaymentToken && paymentTokens.length > 0) {
      setSelectedPaymentToken(paymentTokens[0]);
    }
  }, [paymentTokens, selectedPaymentToken]);

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

  // Calculate estimated fees
  const estimatedFees = useMemo(
    () =>
      calculateEstimatedFees({
        amount: orderForm.amount,
        orderType,
      }),
    [orderForm.amount, orderType],
  );

  // Real-time position size calculation
  const positionSize = useMemo(
    () =>
      calculatePositionSize({
        amount: orderForm.amount,
        price: assetData.price,
      }),
    [orderForm.amount, assetData.price],
  );

  // Real-time margin required calculation
  const marginRequired = useMemo(
    () =>
      calculateMarginRequired({
        amount: orderForm.amount,
        leverage: orderForm.leverage,
      }),
    [orderForm.amount, orderForm.leverage],
  );

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

  // Order validation
  const orderValidation = useMemo(
    () =>
      validatePerpsOrder({
        orderForm,
        marginRequired,
        availableBalance,
        marketData,
        selectedPaymentToken,
        orderType,
      }),
    [
      orderForm,
      marginRequired,
      availableBalance,
      marketData,
      selectedPaymentToken,
      orderType,
    ],
  );

  // Handlers

  const handleAmountPress = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      setOrderForm((prev) => ({ ...prev, amount: value || '0' }));
    },
    [],
  );

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      if (availableBalance === 0) return;
      const newAmount = Math.floor(availableBalance * percentage).toString();
      setOrderForm((prev) => ({ ...prev, amount: newAmount }));
    },
    [availableBalance],
  );

  const handleMaxPress = useCallback(() => {
    if (availableBalance === 0) return;
    setOrderForm((prev) => ({
      ...prev,
      amount: Math.floor(availableBalance).toString(),
    }));
  }, [availableBalance]);

  const handleMinPress = useCallback(() => {
    const minAmount =
      currentNetwork === 'mainnet'
        ? TRADING_DEFAULTS.amount.mainnet
        : TRADING_DEFAULTS.amount.testnet;
    setOrderForm((prev) => ({
      ...prev,
      amount: minAmount.toString(),
    }));
  }, [currentNetwork]);

  const handleDonePress = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const handlePlaceOrder = useCallback(async () => {
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
      return;
    }

    try {
      setIsPlacingOrder(true);

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

      DevLogger.log(
        'PerpsOrderView: Placing order',
        JSON.stringify(orderParams, null, 2),
      );

      const result = await placeOrder(orderParams);

      if (result.success) {
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

        // Fetch positions to get the newly created position
        try {
          // Add a small delay to ensure the position is available
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const positions = await getPositions();
          const newPosition = positions.find((p) => p.coin === orderForm.asset);

          if (newPosition) {
            navigation.navigate(Routes.PERPS.POSITION_DETAILS, {
              position: newPosition,
            });
          } else {
            // Fallback: Navigate to positions list if we can't find the specific position
            navigation.navigate(Routes.PERPS.POSITIONS);
          }
        } catch (error) {
          DevLogger.log(
            'PerpsOrderView: Error fetching positions after order',
            error,
          );
          // Fallback: Navigate to positions list
          navigation.navigate(Routes.PERPS.POSITIONS);
        }
      } else {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('perps.order.error.placement_failed'),
              isBold: true,
            },
            { label: ': ', isBold: false },
            {
              label: result.error || strings('perps.order.error.unknown'),
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
      }
    } catch (error) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('perps.order.error.network_error'), isBold: true },
          { label: ': ', isBold: false },
          {
            label:
              error instanceof Error
                ? error.message
                : strings('perps.order.error.unknown'),
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
    } finally {
      setIsPlacingOrder(false);
    }
  }, [
    orderValidation,
    toastRef,
    orderForm,
    positionSize,
    assetData.price,
    placeOrder,
    getPositions,
    navigation,
    orderType,
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
              onValueChange={(value) =>
                setOrderForm((prev) => ({
                  ...prev,
                  amount: Math.floor(value).toString(),
                }))
              }
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
                          'What is Leverage?',
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
                {strings('perps.order.estimated_execution_time')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  openTooltipModal(
                    'Execution Time',
                    tooltipContent.executionTime,
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
              {strings('perps.order.one_to_three_seconds')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.margin')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  openTooltipModal('Margin Requirements', tooltipContent.margin)
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
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.order.liquidation_price')}
            </Text>
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
                  openTooltipModal('Trading Fees', tooltipContent.fees)
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
              orderValidation.errors.length > 0
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
          setOrderForm((prev) => ({
            ...prev,
            takeProfitPrice,
            stopLossPrice,
          }));
          setIsTPSLVisible(false);
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
          setOrderForm((prev) => ({ ...prev, leverage }));
          setIsLeverageVisible(false);
        }}
        leverage={orderForm.leverage}
        minLeverage={1}
        maxLeverage={
          marketData?.maxLeverage || PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE
        }
        currentPrice={assetData.price}
        liquidationPrice={parseFloat(liquidationPrice)}
        direction={orderForm.direction}
      />

      {/* Limit Price Bottom Sheet */}
      <PerpsLimitPriceBottomSheet
        isVisible={isLimitPriceVisible}
        onClose={() => setIsLimitPriceVisible(false)}
        onConfirm={(limitPrice) => {
          setOrderForm((prev) => ({ ...prev, limitPrice }));
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
            setOrderForm((prev) => ({ ...prev, limitPrice: undefined }));
          }
          setIsOrderTypeVisible(false);
        }}
        currentOrderType={orderType}
      />
    </SafeAreaView>
  );
};

export default PerpsOrderView;
