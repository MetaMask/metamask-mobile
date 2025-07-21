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
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import { useSelector } from 'react-redux';
import { selectTokenList } from '../../../../../selectors/tokenListController';
import { selectIsIpfsGatewayEnabled } from '../../../../../selectors/preferencesController';
import { enhanceTokenWithIcon } from '../../utils/tokenIconUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import PerpsSlider from '../../components/PerpsSlider';
import PerpsTokenSelector, {
  type PerpsToken,
} from '../../components/PerpsTokenSelector';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import {
  usePerpsAccount,
  usePerpsTrading,
  usePerpsNetwork,
  usePerpsPrices,
  usePerpsPaymentTokens,
} from '../../hooks';
import type {
  MarketInfo,
  PerpsNavigationParamList,
} from '../../controllers/types';
import {
  TRADING_DEFAULTS,
  FEE_RATES,
  RISK_MANAGEMENT,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '../../constants/hyperLiquidConfig';
import createStyles from './PerpsOrderView.styles';
import { formatPrice } from '../../utils/formatUtils';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import {
  getDefaultNetworkByChainId,
  getNetworkImageSource,
} from '../../../../../util/networks';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import PerpsTPSLBottomSheet from '../../components/PerpsTPSLBottomSheet';
import PerpsLeverageBottomSheet from '../../components/PerpsLeverageBottomSheet';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';

// Order form state interface
interface OrderFormState {
  asset: string;
  direction: 'long' | 'short';
  amount: string;
  leverage: number;
  balancePercent: number;
  takeProfitPrice?: string;
  stopLossPrice?: string;
  limitPrice?: string;
}

// Navigation params interface
interface OrderRouteParams {
  direction?: 'long' | 'short';
  asset?: string;
  amount?: string;
  leverage?: number;
  // Modal return values
  leverageUpdate?: number;
  orderTypeUpdate?: 'market' | 'limit';
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
  const { placeOrder, getMarkets } = usePerpsTrading();
  const currentNetwork = usePerpsNetwork();
  const cachedAccountState = usePerpsAccount();

  // Get real HyperLiquid USDC balance
  const availableBalance = parseFloat(
    cachedAccountState?.availableBalance?.toString() || '0',
  );

  // Market data state
  const [marketData, setMarketData] = useState<MarketInfo | null>(null);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(true);

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
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [selectedPaymentToken, setSelectedPaymentToken] =
    useState<PerpsToken | null>(null);

  useEffect(() => {
    // Track route param changes
  }, [route.params]);
  const [isTokenSelectorVisible, setIsTokenSelectorVisible] = useState(false);
  const [isTPSLVisible, setIsTPSLVisible] = useState(false);
  const [isLeverageVisible, setIsLeverageVisible] = useState(false);
  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);

  const paymentTokens = usePerpsPaymentTokens();

  // Tooltip content for educational info
  const tooltipContent = {
    leverage: (
      <View>
        <Text variant={TextVariant.BodyMD}>
          Leverage allows you to control a larger position with less capital, amplifying both profits and losses.
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
            • Start with lower leverage if you're new
          </Text>
        </View>
      </View>
    ),
    executionTime: (
      <View>
        <Text variant={TextVariant.BodyMD}>
          Orders are executed nearly instantly on HyperLiquid's high-performance blockchain.
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
          Margin is the collateral required to open and maintain a leveraged position.
        </Text>
        <View style={styles.tooltipSection}>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Initial margin = Position size ÷ Leverage
          </Text>
          <Text variant={TextVariant.BodyMD} style={styles.tooltipItem}>
            • Maintenance margin = 0.625% of position size
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
          Fees are charged on every trade to cover the cost of execution and liquidity provision.
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

  // Get real-time price data - include order book for limit orders
  const priceData = usePerpsPrices(assetSymbols, orderType === 'limit');
  const currentPrice = priceData[orderForm.asset];
  const assetData = useMemo(() => {
    if (!currentPrice) {
      return { price: 0, change: 0 };
    }
    return {
      price: parseFloat(currentPrice.price || '0'),
      change: parseFloat(currentPrice.percentChange24h || '0'),
    };
  }, [currentPrice]);

  // Enhanced USDC token for Pay with
  const enhancedUsdcToken = useMemo(() => {
    if (!tokenList) return null;

    return enhanceTokenWithIcon({
      token: {
        symbol: 'USDC',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
        decimals: 6,
        chainId: '0xa4b1',
        name: 'USD Coin',
      },
      tokenList,
      isIpfsGatewayEnabled,
    });
  }, [tokenList, isIpfsGatewayEnabled]);

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    try {
      const markets = await getMarkets({ symbols: [asset] });
      const assetMarket = markets.find((market) => market.name === asset);

      if (!assetMarket) {
        // Asset not found - show error
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

      setMarketData(assetMarket || null);
    } catch (error) {
      setMarketData(null);
    }
  }, [getMarkets, asset, toastRef, navigation]);

  useEffect(() => {
    setIsLoadingMarketData(true);
    fetchMarketData().finally(() => {
      setIsLoadingMarketData(false);
    });
  }, [fetchMarketData]);

  // Calculate estimated fees
  const estimatedFees = useMemo(() => {
    const amount = parseFloat(orderForm.amount || '0');
    const feeRate = orderType === 'market' ? FEE_RATES.market : FEE_RATES.limit;
    const fee = amount * feeRate;
    return fee;
  }, [orderForm.amount, orderType]);

  // Real-time position size calculation
  const positionSize = useMemo(() => {
    const amount = parseFloat(orderForm.amount || '0');
    if (amount === 0 || assetData.price === 0) return '0.000000';
    return (amount / assetData.price).toFixed(6);
  }, [orderForm.amount, assetData.price]);

  // Real-time margin required calculation
  const marginRequired = useMemo(() => {
    const amount = parseFloat(orderForm.amount || '0');
    if (amount === 0 || orderForm.leverage === 0) return '0.00';
    return (amount / orderForm.leverage).toFixed(2);
  }, [orderForm.amount, orderForm.leverage]);

  // Real-time liquidation price calculation
  const liquidationPrice = useMemo(() => {
    const entryPrice = assetData.price;
    if (entryPrice === 0 || orderForm.leverage === 0) return '0.00';

    const maintenanceMargin = RISK_MANAGEMENT.maintenanceMargin;
    const leverageRatio = 1 / orderForm.leverage;

    if (orderForm.direction === 'long') {
      const liquidationRatio = 1 - (leverageRatio - maintenanceMargin);
      return (entryPrice * liquidationRatio).toFixed(2);
    }
    const liquidationRatio = 1 + (leverageRatio - maintenanceMargin);
    return (entryPrice * liquidationRatio).toFixed(2);
  }, [assetData.price, orderForm.leverage, orderForm.direction]);

  // Order validation
  const orderValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const amount = parseFloat(orderForm.amount || '0');
    if (amount <= 0) {
      errors.push(strings('perps.order.validation.amount_required'));
    }

    if (amount > 0 && amount < 10) {
      errors.push(
        strings('perps.order.validation.minimum_amount', { amount: '10' }),
      );
    }

    if (amount > 100000) {
      errors.push(
        strings('perps.order.validation.maximum_amount', { amount: '100,000' }),
      );
    }

    const requiredMargin = parseFloat(marginRequired);
    if (requiredMargin > availableBalance) {
      errors.push(
        strings('perps.order.validation.insufficient_balance', {
          required: marginRequired,
          available: availableBalance.toString(),
        }),
      );
    }

    const maxLeverage =
      marketData?.maxLeverage || RISK_MANAGEMENT.fallbackMaxLeverage;
    if (orderForm.leverage < 1 || orderForm.leverage > maxLeverage) {
      errors.push(
        strings('perps.order.validation.invalid_leverage', {
          min: '1',
          max: maxLeverage.toString(),
        }),
      );
    }

    if (orderForm.leverage > RISK_MANAGEMENT.fallbackMaxLeverage) {
      warnings.push(strings('perps.order.validation.high_leverage_warning'));
    }

    // Check if selected payment token is not Hyperliquid USDC (mainnet or testnet)
    if (
      selectedPaymentToken &&
      selectedPaymentToken.chainId !== HYPERLIQUID_MAINNET_CHAIN_ID &&
      selectedPaymentToken.chainId !== HYPERLIQUID_TESTNET_CHAIN_ID
    ) {
      errors.push(strings('perps.order.validation.only_hyperliquid_usdc'));
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  }, [
    orderForm,
    marginRequired,
    availableBalance,
    marketData,
    selectedPaymentToken,
  ]);

  // Handlers

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

      const orderParams = {
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

        navigation.navigate(Routes.PERPS.ORDER_SUCCESS, {
          orderId: result.orderId || 'unknown',
          direction: orderForm.direction,
          asset: orderForm.asset,
          size: orderForm.amount,
          price: currentPrice?.toString() || '0',
          leverage: orderForm.leverage,
          takeProfitPrice: orderForm.takeProfitPrice,
          stopLossPrice: orderForm.stopLossPrice,
        });
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
    navigation,
    currentPrice,
    orderType,
  ]);

  return (
    <SafeAreaView style={styles.container}>
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
        />

        {/* Amount Slider */}
        <View style={styles.sliderSection}>
          <PerpsSlider
            value={parseFloat(orderForm.amount || '0')}
            onValueChange={(value) =>
              setOrderForm((prev) => ({ ...prev, amount: value.toString() }))
            }
            minimumValue={0}
            maximumValue={availableBalance}
            step={1}
            showPercentageLabels
          />
        </View>

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
                      onPress={() => openTooltipModal('What is Leverage?', tooltipContent.leverage)}
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
                        : formatPrice(assetData.price)}
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
                onPress={() => openTooltipModal('Execution Time', tooltipContent.executionTime)}
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
              {strings('perps.order.less_than_one_second')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.order.margin')}
              </Text>
              <TouchableOpacity
                onPress={() => openTooltipModal('Margin Requirements', tooltipContent.margin)}
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
                onPress={() => openTooltipModal('Trading Fees', tooltipContent.fees)}
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

      {/* Fixed Place Order Button */}
      <View style={styles.fixedBottomContainer}>
        {orderValidation.errors.length > 0 && (
          <View style={styles.validationContainer}>
            {orderValidation.errors.map((error, index) => (
              <Text
                key={index}
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
      {isTPSLVisible && (
        <PerpsTPSLBottomSheet
          isVisible
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
      )}

      {/* Leverage Selector */}
      {isLeverageVisible && (
        <PerpsLeverageBottomSheet
          isVisible
          onClose={() => setIsLeverageVisible(false)}
          onConfirm={(leverage) => {
            setOrderForm((prev) => ({ ...prev, leverage }));
            setIsLeverageVisible(false);
          }}
          leverage={orderForm.leverage}
          minLeverage={1}
          maxLeverage={marketData?.maxLeverage || 50}
          currentPrice={assetData.price}
          liquidationPrice={parseFloat(liquidationPrice)}
          direction={orderForm.direction}
        />
      )}

      {/* Limit Price Bottom Sheet */}
      {isLimitPriceVisible && (
        <PerpsLimitPriceBottomSheet
          isVisible
          onClose={() => setIsLimitPriceVisible(false)}
          onConfirm={(limitPrice) => {
            setOrderForm((prev) => ({ ...prev, limitPrice }));
            setIsLimitPriceVisible(false);
          }}
          asset={orderForm.asset}
          limitPrice={orderForm.limitPrice}
          currentPrice={assetData.price}
        />
      )}

      {/* Order Type Bottom Sheet */}
      {isOrderTypeVisible && (
        <PerpsOrderTypeBottomSheet
          isVisible
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
      )}
    </SafeAreaView>
  );
};

export default PerpsOrderView;
