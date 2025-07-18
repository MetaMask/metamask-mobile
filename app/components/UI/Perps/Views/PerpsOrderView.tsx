import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Button, { ButtonVariants, ButtonSize, ButtonWidthTypes } from '../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import Icon, { IconColor, IconName, IconSize } from '../../../../component-library/components/Icons/Icon';
import Text from '../../../../component-library/components/Texts/Text';
import { ToastContext, ToastVariants } from '../../../../component-library/components/Toast';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { store } from '../../../../store';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import PerpsTPSLModal from '../components/PerpsTPSLModal';
import PerpsSlider from '../components/PerpsSlider';
import PerpsOrderTypeBottomSheet, { type PerpsOrderTypeBottomSheetRef } from '../components/PerpsOrderTypeBottomSheet';
import PerpsLeverageBottomSheet, { type PerpsLeverageBottomSheetRef } from '../components/PerpsLeverageBottomSheet';
import { usePerpsAccount, usePerpsTrading, usePerpsNetwork, usePerpsPrices } from '../hooks';
// Use the SDK directly without our abstractions
import { HttpTransport, InfoClient, ExchangeClient } from '@deeeed/hyperliquid-node20';
import { actionSorter, signL1Action } from '@deeeed/hyperliquid-node20/esm/src/signing/mod';
import type { OrderParams } from '@deeeed/hyperliquid-node20/esm/src/types/exchange/requests';
import type { PerpsUniverse } from '@deeeed/hyperliquid-node20/esm/src/types/info/assets';
// Import utilities for clean test code
import { formatHyperLiquidPrice, formatHyperLiquidSize, calculatePositionSize, buildAssetMapping } from '../utils/hyperLiquidAdapter';
import type { MarketInfo, PerpsNavigationParamList } from '../controllers/types';
import { TRADING_DEFAULTS, FEE_RATES, RISK_MANAGEMENT } from '../constants/hyperLiquidConfig';

// Order form state interface
interface OrderFormState {
  asset: string;
  direction: 'long' | 'short';
  amount: string;
  leverage: number;
  balancePercent: number; // Percentage of available balance being used
  takeProfitPrice?: string; // Absolute price for take profit (e.g., "52500")
  stopLossPrice?: string;   // Absolute price for stop loss (e.g., "48500")
}

// Navigation params interface
interface OrderRouteParams {
  direction?: 'long' | 'short';
  asset?: string;
  amount?: string; // Default amount for deeplinks
  leverage?: number; // Default leverage
}


const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    backButton: {
      marginRight: 16,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerTitle: {
      color: colors.text.default,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    headerPrice: {
      color: colors.text.muted, // Secondary text color as requested
      fontSize: 16,
      fontWeight: '500',
    },
    headerPriceChange: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    headerPriceChangePositive: {
      color: colors.success.default, // Use MetaMask success color - closest to requested green
    },
    headerPriceChangeNegative: {
      color: colors.error.default,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    scrollView: {
      flex: 1,
    },
    priceSection: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 24,
    },
    priceText: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 4,
    },
    priceChangeText: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 16,
    },
    marketBadge: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    marketBadgeText: {
      color: colors.text.muted,
      fontSize: 14,
      fontWeight: '500',
    },
    amountSection: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    amountText: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
      marginBottom: 8,
    },
    btcAmountText: {
      fontSize: 16,
      color: colors.text.muted,
    },
    marginSection: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    sliderContainer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    orderDetails: {
      paddingHorizontal: 24,
    },
    // New styles for redesigned layout
    amountDisplay: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 16,
    },
    amountValue: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
    },
    amountMax: {
      fontSize: 14,
      color: colors.text.muted,
      marginTop: 4,
    },
    sliderSection: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    detailsSection: {
      paddingHorizontal: 0,
      backgroundColor: colors.background.alternative,
    },
    detailLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    detailRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoIcon: {
      marginLeft: 8,
      padding: 4,
    },
    payWithRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary.default,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    tokenIconText: {
      color: colors.primary.inverse,
      fontSize: 12,
      fontWeight: '600',
    },
    infoSection: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.text.muted,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text.muted,
    },
    footer: {
      padding: 24,
      paddingBottom: 32,
    },
    validationContainer: {
      marginBottom: 12,
    },
    errorText: {
      fontSize: 14,
      color: colors.error.default,
      marginBottom: 4,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    detailLabel: {
      fontSize: 16,
      color: colors.text.default,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    leverageContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    leverageButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.default,
    },
    leverageButtonSelected: {
      backgroundColor: colors.primary.default,
      borderColor: colors.primary.default,
    },
    leverageButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.muted,
    },
    leverageButtonTextSelected: {
      color: colors.primary.inverse,
    },
    addButton: {
      color: colors.primary.default,
      fontSize: 16,
      fontWeight: '600',
    },
    actionButton: {
      marginLeft: 8,
    },
    amountInput: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
      textAlign: 'center',
      backgroundColor: colors.background.default,
      padding: 0,
      margin: 0,
      minHeight: 60,
    },
    amountInputWithDollar: {
      fontSize: 48,
      fontWeight: '300',
      color: colors.text.default,
      textAlign: 'center',
      backgroundColor: colors.background.default,
      padding: 0,
      margin: 0,
      minHeight: 60,
    },
    bottomSection: {
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    bottomLabel: {
      fontSize: 16,
      color: colors.text.muted,
    },
    bottomValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
    },
    placeOrderButton: {
      backgroundColor: colors.primary.default,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 24,
      marginBottom: 24,
    },
    placeOrderButtonDisabled: {
      backgroundColor: colors.background.alternative,
    },
    placeOrderButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary.inverse,
    },
    placeOrderButtonTextDisabled: {
      color: colors.text.muted,
    },
    headerCenterRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailRowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    marketButton: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    marketButtonText: {
      color: colors.text.muted,
      fontSize: 14,
      fontWeight: '500',
    },
    directionButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.muted,
      backgroundColor: colors.background.default,
      marginRight: 8,
    },
    directionButtonSelected: {
      backgroundColor: colors.primary.default,
      borderColor: colors.primary.default,
    },
    directionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.muted,
    },
    directionButtonTextSelected: {
      color: colors.primary.inverse,
    },
    marginLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background.alternative + '80', // Semi-transparent overlay
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: colors.background.default,
      padding: 24,
      borderRadius: 12,
      width: '80%',
    },
    modalTitle: {
      color: colors.text.default,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    modalOption: {
      padding: 12,
      marginBottom: 8,
    },
    modalOptionSelected: {
      backgroundColor: colors.primary.default,
      borderRadius: 8,
    },
    modalOptionText: {
      color: colors.text.default,
    },
    modalOptionTextSelected: {
      color: colors.primary.inverse,
    },
    modalCancel: {
      padding: 8,
      marginTop: 8,
    },
    modalCancelText: {
      color: colors.text.muted,
      textAlign: 'center',
    },
    // Debug Panel Styles
    debugPanel: {
      backgroundColor: colors.background.alternative,
      marginHorizontal: 24,
      marginBottom: 16,
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    debugPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    debugPanelTitle: {
      color: colors.text.default,
      fontSize: 16,
      fontWeight: '600',
    },
    debugToggle: {
      color: colors.primary.default,
      fontSize: 14,
      fontWeight: '500',
    },
    debugRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    debugLabel: {
      color: colors.text.default,
      fontSize: 14,
    },
    debugButton: {
      backgroundColor: colors.primary.default,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginHorizontal: 4,
    },
    debugButtonText: {
      color: colors.primary.inverse,
      fontSize: 12,
      fontWeight: '500',
    },
    debugTestButton: {
      backgroundColor: colors.warning.default,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: 4,
    },
    debugTestButtonText: {
      color: colors.warning.inverse,
      fontSize: 14,
      fontWeight: '600',
    },
    debugButtonRow: {
      flexDirection: 'row',
    },
  });

const PerpsOrderView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<RouteProp<{ params: OrderRouteParams }, 'params'>>();
  const toastContext = useContext(ToastContext);

  // Bottom sheet refs
  const orderTypeBottomSheetRef = useRef<PerpsOrderTypeBottomSheetRef>(null);
  const leverageBottomSheetRef = useRef<PerpsLeverageBottomSheetRef>(null);
  const toastRef = toastContext?.toastRef;

  // Get navigation params
  const {
    direction = 'long',
    asset = 'BTC',
    amount: paramAmount,
    leverage: paramLeverage
  } = route.params || {};

  // Get PerpsController methods and state
  const { placeOrder, getMarkets } = usePerpsTrading();
  const currentNetwork = usePerpsNetwork();
  const cachedAccountState = usePerpsAccount();

  // Get real HyperLiquid USDC balance
  const availableBalance = parseFloat(cachedAccountState?.availableBalance?.toString() || '0');

  // Market data state for dynamic leverage limits
  const [marketData, setMarketData] = useState<MarketInfo | null>(null);

  // Fetch account balance on mount
  useEffect(() => {
    const fetchAccountBalance = async () => {
      try {
        DevLogger.log('PerpsOrderView: Fetching account state...');
        const state = await Engine.context.PerpsController?.getAccountState();
        DevLogger.log('PerpsOrderView: Account state fetched:', state);
      } catch (error) {
        DevLogger.log('PerpsOrderView: Failed to fetch account balance:', error);
      }
    };
    fetchAccountBalance();
  }, []);

  // Fetch market data for current asset to get dynamic leverage limits
  const fetchMarketData = useCallback(async () => {
    try {
      const markets = await getMarkets({ symbols: [asset] });
      const assetMarket = markets.find(market => market.name === asset);
      setMarketData(assetMarket || null);
    } catch (error) {
      DevLogger.log('Failed to fetch market data:', error);
      setMarketData(null);
    }
  }, [getMarkets, asset]);

  // Fetch market data when asset changes
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  /**
   * Calculate default TP/SL prices based on JIRA requirements:
   * - Default TP = 30% profit target
   * - Default SL = 10% loss limit
   */
  const calculateDefaultTPSL = useCallback((currentPrice: number, orderDirection: 'long' | 'short') => {
    if (currentPrice <= 0) return { takeProfitPrice: undefined, stopLossPrice: undefined };

    if (orderDirection === 'long') {
      // Long position: TP above entry, SL below entry
      const takeProfitPrice = (currentPrice * (1 + TRADING_DEFAULTS.takeProfitPercent)).toString(); // 30% above
      const stopLossPrice = (currentPrice * (1 - TRADING_DEFAULTS.stopLossPercent)).toString();   // 10% below
      return { takeProfitPrice, stopLossPrice };
    }
      // Short position: TP below entry, SL above entry
      const takeProfitPrice = (currentPrice * (1 - TRADING_DEFAULTS.takeProfitPercent)).toString(); // 30% below
      const stopLossPrice = (currentPrice * (1 + TRADING_DEFAULTS.stopLossPercent)).toString();   // 10% above
      return { takeProfitPrice, stopLossPrice };

  }, []);

  // Calculate initial balance percentage
  const defaultAmount = currentNetwork === 'mainnet' ? TRADING_DEFAULTS.amount.mainnet : TRADING_DEFAULTS.amount.testnet;
  const initialMarginRequired = defaultAmount / TRADING_DEFAULTS.leverage;
  const initialBalancePercent = availableBalance > 0 ?
    Math.min((initialMarginRequired / availableBalance) * 100, 100) : TRADING_DEFAULTS.marginPercent;

  // Determine default amount - priority: route params > network defaults
  const defaultAmountValue = paramAmount || (currentNetwork === 'mainnet' ? TRADING_DEFAULTS.amount.mainnet.toString() : TRADING_DEFAULTS.amount.testnet.toString());
  const defaultLeverageValue = paramLeverage || TRADING_DEFAULTS.leverage;

  // Order form state - Initialize with navigation params
  const [orderForm, setOrderForm] = useState<OrderFormState>({
    asset,
    direction,
    amount: defaultAmountValue,
    leverage: defaultLeverageValue,
    balancePercent: Math.round(initialBalancePercent * 100) / 100, // Calculate based on actual balance
    takeProfitPrice: undefined, // No default TP/SL - user must explicitly set them
    stopLossPrice: undefined,
  });

  // Memoize the asset array to prevent re-subscriptions
  const assetSymbols = useMemo(() => [orderForm.asset], [orderForm.asset]);

  // Get real-time price data for the asset (after orderForm is defined)
  const priceData = usePerpsPrices(assetSymbols);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isTpSlModalVisible, setTpSlModalVisible] = useState(false);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [isOrderTypeBottomSheetVisible, setIsOrderTypeBottomSheetVisible] = useState(false);
  const [isLeverageBottomSheetVisible, setIsLeverageBottomSheetVisible] = useState(false);

  // Debug/Development Settings
  const [isDebugPanelVisible, setDebugPanelVisible] = useState(__DEV__); // Show debug panel in dev mode
  const [useSDKSignL1, setUseSDKSignL1] = useState(true); // signL1Action vs exchange.order method

  // Get real asset data from live price feed
  const currentPrice = priceData[orderForm.asset];
  const assetData = useMemo(() => {
    if (!currentPrice) {
      // Fallback if no price data available yet
      return { price: 0, change: 0 };
    }
    return {
      price: parseFloat(currentPrice.price || '0'),
      change: parseFloat(currentPrice.percentChange24h || '0'),
    };
  }, [currentPrice]);

  // Auto-set default TP/SL when price data becomes available (JIRA requirement: 30% TP, 10% SL)
  useEffect(() => {
    if (assetData.price > 0 && !orderForm.takeProfitPrice && !orderForm.stopLossPrice) {
      const defaults = calculateDefaultTPSL(assetData.price, orderForm.direction);
      setOrderForm(prev => ({
        ...prev,
        takeProfitPrice: defaults.takeProfitPrice,
        stopLossPrice: defaults.stopLossPrice,
      }));
    }
  }, [assetData.price, orderForm.direction, orderForm.takeProfitPrice, orderForm.stopLossPrice, calculateDefaultTPSL]);

  // Calculate estimated fees using config constants
  const estimatedFees = useMemo(() => {
    const amount = parseFloat(orderForm.amount || '0');
    const feeRate = orderType === 'market' ? FEE_RATES.market : FEE_RATES.limit;
    const fee = amount * feeRate;

    // Show more decimal places for very small fees
    if (fee >= 0.01) {
      return fee.toFixed(2); // 2 decimal places for fees >= $0.01
    } else if (fee >= 0.0001) {
      return parseFloat(fee.toFixed(4)).toString(); // 4 decimal places for fees < $0.01 but >= $0.0001, remove trailing zeros
    }
      return parseFloat(fee.toFixed(6)).toString(); // 6 decimal places for fees < $0.0001, remove trailing zeros

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

    // More accurate liquidation calculation based on maintenance margin
    const maintenanceMargin = RISK_MANAGEMENT.maintenanceMargin;
    const leverageRatio = 1 / orderForm.leverage;

    if (orderForm.direction === 'long') {
      // For long: liquidation = entry * (1 - (1/leverage - maintenance_margin))
      const liquidationRatio = 1 - (leverageRatio - maintenanceMargin);
      return (entryPrice * liquidationRatio).toFixed(2);
    }
    // For short: liquidation = entry * (1 + (1/leverage - maintenance_margin))
    const liquidationRatio = 1 + (leverageRatio - maintenanceMargin);
    return (entryPrice * liquidationRatio).toFixed(2);

  }, [assetData.price, orderForm.leverage, orderForm.direction]);

  // TP/SL prices are now stored directly as absolute values
  const takeProfitPrice = orderForm.takeProfitPrice ? parseFloat(orderForm.takeProfitPrice) : undefined;
  const stopLossPrice = orderForm.stopLossPrice ? parseFloat(orderForm.stopLossPrice) : undefined;

  // Order validation
  const orderValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate amount
    const amount = parseFloat(orderForm.amount || '0');
    if (amount <= 0) {
      errors.push(strings('perps.order.validation.amount_required'));
    }

    // Validate minimum order size (example: $10 minimum)
    if (amount > 0 && amount < 10) {
      errors.push(strings('perps.order.validation.minimum_amount', { amount: '10' }));
    }

    // Validate maximum order size (example: $100,000 maximum)
    if (amount > 100000) {
      errors.push(strings('perps.order.validation.maximum_amount', { amount: '100,000' }));
    }

    // Check if user has sufficient balance for margin
    const requiredMargin = parseFloat(marginRequired);

    if (requiredMargin > availableBalance) {
      errors.push(strings('perps.order.validation.insufficient_balance', { required: marginRequired, available: availableBalance.toString() }));
    }

    // Validate leverage
    const maxLeverage = marketData?.maxLeverage || RISK_MANAGEMENT.fallbackMaxLeverage;
    if (orderForm.leverage < 1 || orderForm.leverage > maxLeverage) {
      errors.push(strings('perps.order.validation.invalid_leverage', { min: '1', max: maxLeverage.toString() }));
    }

    // Warn about high leverage
    if (orderForm.leverage > RISK_MANAGEMENT.fallbackMaxLeverage) {
      warnings.push(strings('perps.order.validation.high_leverage_warning'));
    }

    // Validate TP/SL levels only if they are set
    if (takeProfitPrice && orderForm.direction === 'long' && takeProfitPrice <= assetData.price) {
      errors.push(strings('perps.order.validation.invalid_take_profit', { direction: 'above', positionType: 'long' }));
    }
    if (takeProfitPrice && orderForm.direction === 'short' && takeProfitPrice >= assetData.price) {
      errors.push(strings('perps.order.validation.invalid_take_profit', { direction: 'below', positionType: 'short' }));
    }
    if (stopLossPrice && orderForm.direction === 'long' && stopLossPrice >= assetData.price) {
      errors.push(strings('perps.order.validation.invalid_stop_loss', { direction: 'below', positionType: 'long' }));
    }
    if (stopLossPrice && orderForm.direction === 'short' && stopLossPrice <= assetData.price) {
      errors.push(strings('perps.order.validation.invalid_stop_loss', { direction: 'above', positionType: 'short' }));
    }

    // Check liquidation proximity
    const liquidationPriceNum = parseFloat(liquidationPrice);
    const priceDistance = Math.abs(liquidationPriceNum - assetData.price) / assetData.price;

    if (priceDistance < 0.1) { // Less than 10% from liquidation
      warnings.push(strings('perps.order.validation.liquidation_warning'));
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  }, [orderForm, marginRequired, takeProfitPrice, stopLossPrice, assetData.price, liquidationPrice, availableBalance, marketData]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);


  // Handle order type toggle
  const handleOrderTypeToggle = useCallback(() => {
    setIsOrderTypeBottomSheetVisible(true);
  }, []);

  // Handle place order
  const handlePlaceOrder = useCallback(async () => {
    // Validate order before placing
    if (!orderValidation.isValid) {
      DevLogger.log('PerpsOrderView: Order validation failed', {
        errors: orderValidation.errors,
        warnings: orderValidation.warnings,
      });

      // Show validation errors via toast
      const firstError = orderValidation.errors[0];
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('perps.order.validation.failed'), isBold: true },
          { label: ': ', isBold: false },
          { label: firstError, isBold: false }
        ],
        iconName: IconName.Warning,
        iconColor: IconColor.Warning,
        hasNoTimeout: true,
      });
      return;
    }

    try {
      setIsPlacingOrder(true);

      DevLogger.log('PerpsOrderView: Placing order', {
        orderForm,
        positionSize,
        marginRequired,
        liquidationPrice,
        validation: orderValidation,
      });

      // Call PerpsController placeOrder method
      const orderParams = {
        coin: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: positionSize,
        orderType: 'market' as const,
        takeProfitPrice: orderForm.takeProfitPrice,
        stopLossPrice: orderForm.stopLossPrice,
        currentPrice: assetData.price, // Pass the current price from our working price feed
      };

      const result = await placeOrder(orderParams);

      if (result.success) {
        DevLogger.log('PerpsOrderView: Order placed successfully', result);

        // Show success toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            { label: strings('perps.order.orderPlaced.order_placed'), isBold: true },
            { label: ' - ', isBold: false },
            { label: `${orderForm.direction.toUpperCase()} ${orderForm.asset}`, isBold: true }
          ],
          iconName: IconName.CheckBold,
          iconColor: IconColor.Success,
          hasNoTimeout: false,
        });

        navigation.navigate('PerpsOrderSuccess', {
          orderId: result.orderId || 'unknown',
          direction: orderForm.direction,
          asset: orderForm.asset,
          size: orderForm.amount,
          price: currentPrice?.toString() || '0',
          leverage: orderForm.leverage,
        });
      } else {
        DevLogger.log('PerpsOrderView: Order failed', result);

        // Show error toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            { label: strings('perps.order.error.placement_failed'), isBold: true },
            { label: ': ', isBold: false },
            { label: result.error || strings('perps.order.error.unknown'), isBold: false }
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
      DevLogger.log('PerpsOrderView: Order error', error);

      // Show error toast for exceptions
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('perps.order.error.network_error'), isBold: true },
          { label: ': ', isBold: false },
          { label: error instanceof Error ? error.message : strings('perps.order.error.unknown'), isBold: false }
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
  }, [orderValidation, toastRef, orderForm, positionSize, marginRequired, liquidationPrice, assetData.price, placeOrder, navigation, currentPrice]);
  const selectedAddress = selectSelectedInternalAccountAddress(store.getState());


  // Helper function to create test order with utilities using dynamic form values
  const createTestOrder = useCallback(async (): Promise<{ order: OrderParams; transport: HttpTransport }> => {
    const isTestnet = currentNetwork === 'testnet';
    const transport = new HttpTransport({ isTestnet });
    const infoClient = new InfoClient({ transport });
    const meta = await infoClient.meta();
    const mids = await infoClient.allMids();

    // Build asset mapping
    const { coinToAssetId } = buildAssetMapping(meta.universe);
    const assetInfo: PerpsUniverse | undefined = meta.universe.find(assetItem => assetItem.name === orderForm.asset);
    if (!assetInfo) throw new Error(`${orderForm.asset} not found`);

    // Use dynamic values from the form
    const currentAssetPrice: number = parseFloat(mids[orderForm.asset] || '0');
    const usdAmount: number = parseFloat(orderForm.amount || '0');
    const leverage: number = orderForm.leverage;
    const isLong: boolean = orderForm.direction === 'long';

    // Calculate position size using form values
    const calculatedPositionSize: number = calculatePositionSize({
      usdValue: usdAmount,
      leverage,
      assetPrice: currentAssetPrice
    });

    // Add slippage for market orders (1% for buys, -1% for sells)
    const slippage: number = 0.01;
    const orderPrice: number = isLong
      ? currentAssetPrice * (1 + slippage)  // Buy above market
      : currentAssetPrice * (1 - slippage); // Sell below market

    // Format using utilities
    const formattedPrice: string = formatHyperLiquidPrice({ price: orderPrice, szDecimals: assetInfo.szDecimals });
    const formattedSize: string = formatHyperLiquidSize({ size: calculatedPositionSize, szDecimals: assetInfo.szDecimals });

    const assetId: number | undefined = coinToAssetId.get(orderForm.asset);
    if (assetId === undefined) throw new Error(`${orderForm.asset} asset ID not found`);

    const order: OrderParams = {
      a: assetId,
      b: isLong,
      p: formattedPrice,
      s: formattedSize,
      r: false, // TODO: Support reduce-only orders
      t: orderType === 'limit' ? { limit: { tif: 'Gtc' } } : { limit: { tif: 'Ioc' } }
    };

    DevLogger.log('🧪 TEST ORDER (Dynamic):', {
      asset: orderForm.asset,
      direction: orderForm.direction,
      amount: usdAmount,
      leverage,
      currentAssetPrice,
      calculatedPositionSize,
      formattedPrice,
      formattedSize,
      order
    });

    return { order, transport };
  }, [currentNetwork, orderForm, orderType]);

  const testDirectWalletSignL1Action = useCallback(async () => {
    try {
      setIsPlacingOrder(true);
      DevLogger.log('🧪 TEST: signL1Action method');

      const { order } = await createTestOrder();

      // Create wallet adapter
      const wallet: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } = {
        request: async (args: { method: string; params: unknown[] }): Promise<unknown> => {
          if (args.method === 'eth_requestAccounts') return [selectedAddress];
          if (args.method === 'eth_signTypedData_v4') {
            const [, data] = args.params as [string, string | object];
            const typedData = typeof data === 'string' ? JSON.parse(data) : data;
            return await Engine.context.KeyringController.signTypedMessage(
              { from: selectedAddress as `0x${string}`, data: typedData },
              SignTypedDataVersion.V4
            );
          }
          throw new Error(`Unsupported method: ${args.method}`);
        }
      };

      // Sign and send
      const action = { type: 'order' as const, orders: [order], grouping: 'na' as const };
      const sortedAction = actionSorter.order(action);
      const nonce: number = Date.now();

      const isTestnet: boolean = currentNetwork === 'testnet';
      const signature = await signL1Action({ wallet, action: sortedAction, nonce, isTestnet });

      const apiUrl: string = isTestnet ? 'https://api.hyperliquid-testnet.xyz/exchange' : 'https://api.hyperliquid.xyz/exchange';
      const response: Response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: sortedAction, signature, nonce })
      });

      const result: unknown = await response.json();
      DevLogger.log('✅ signL1Action result:', result);

    } catch (error) {
      DevLogger.log('❌ signL1Action failed:', (error as Error).message);
    } finally {
      setIsPlacingOrder(false);
    }
  }, [selectedAddress, createTestOrder, currentNetwork]);

  const testDirectWalletExchangeOrder = useCallback(async () => {
    try {
      setIsPlacingOrder(true);
      DevLogger.log('🧪 TEST: exchange.order method');

      const { order, transport } = await createTestOrder();

      // Create wallet adapter
      const wallet: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } = {
        request: async (args: { method: string; params: unknown[] }): Promise<unknown> => {
          if (args.method === 'eth_requestAccounts') return [selectedAddress];
          if (args.method === 'eth_signTypedData_v4') {
            const [, data] = args.params as [string, string | object];
            const typedData = typeof data === 'string' ? JSON.parse(data) : data;
            return await Engine.context.KeyringController.signTypedMessage(
              { from: selectedAddress as `0x${string}`, data: typedData },
              SignTypedDataVersion.V4
            );
          }
          throw new Error(`Unsupported method: ${args.method}`);
        }
      };

      // Use high-level ExchangeClient
      const isTestnet: boolean = currentNetwork === 'testnet';
      const exchangeClient: ExchangeClient = new ExchangeClient({ wallet, transport, isTestnet });
      const result: unknown = await exchangeClient.order({ orders: [order], grouping: 'na' });

      DevLogger.log('✅ exchange.order result:', result);

    } catch (error) {
      DevLogger.log('❌ exchange.order failed:', (error as Error).message);
    } finally {
      setIsPlacingOrder(false);
    }
  }, [selectedAddress, createTestOrder, currentNetwork]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          onPress={handleBack}
          iconColor={IconColor.Default}
          style={styles.backButton}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {orderForm.direction === 'long' ? 'Long' : 'Short'} {orderForm.asset}
          </Text>
          <View style={styles.headerCenterRow}>
            <Text style={styles.headerPrice}>
              {assetData.price > 0 ? `$${assetData.price.toLocaleString()}` : 'Loading...'}
            </Text>
            {assetData.price > 0 && (
              <Text style={[
                styles.headerPriceChange,
                assetData.change >= 0 ? styles.headerPriceChangePositive : styles.headerPriceChangeNegative
              ]}>
                {assetData.change >= 0 ? '+' : ''}{assetData.change.toFixed(2)}%
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.marketButton} onPress={handleOrderTypeToggle}>
            <Text style={styles.marketButtonText}>{orderType === 'market' ? 'Market' : 'Limit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Amount Display */}
        <View style={styles.amountDisplay}>
          <Text style={styles.amountValue}>
            ${orderForm.amount || '0'}
          </Text>
          <Text style={styles.amountMax}>
            ${availableBalance.toLocaleString()} max
          </Text>
          {availableBalance === 0 && (
            <Text style={[styles.amountMax, { color: colors.warning.default, marginTop: 8 }]}>
              No funds available. Please deposit first.
            </Text>
          )}
        </View>

        {/* Amount Slider */}
        <View style={styles.sliderSection}>
          <PerpsSlider
            value={parseFloat(orderForm.amount || '0')}
            onValueChange={(value) => setOrderForm(prev => ({ ...prev, amount: value.toString() }))}
            minimumValue={0}
            maximumValue={availableBalance}
            step={1}
            showPercentageLabels
          />
        </View>

        {/* Order Details Rows */}
        <View style={styles.detailsSection}>
          {/* Leverage Row */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setIsLeverageBottomSheetVisible(true)}
          >
            <View style={styles.detailLeft}>
              <Text style={styles.detailLabel}>Leverage</Text>
              <TouchableOpacity style={styles.infoIcon}>
                <Icon name={IconName.Info} size={IconSize.Xss} color={IconColor.Muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>{orderForm.leverage}x</Text>
            </View>
          </TouchableOpacity>

          {/* Pay with Row */}
          <TouchableOpacity style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Text style={styles.detailLabel}>Pay with</Text>
            </View>
            <View style={styles.payWithRight}>
              <View style={styles.tokenIcon}>
                <Text style={styles.tokenIconText}>U</Text>
              </View>
              <Text style={styles.detailValue}>USDC</Text>
            </View>
          </TouchableOpacity>

          {/* Take profit Row */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setTpSlModalVisible(true)}
          >
            <View style={styles.detailLeft}>
              <Text style={styles.detailLabel}>Take profit</Text>
            </View>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>
                {orderForm.takeProfitPrice ? `$${orderForm.takeProfitPrice}` : 'Off'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Stop loss Row */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setTpSlModalVisible(true)}
          >
            <View style={styles.detailLeft}>
              <Text style={styles.detailLabel}>Stop loss</Text>
            </View>
            <View style={styles.detailRight}>
              <Text style={styles.detailValue}>
                {orderForm.stopLossPrice ? `$${orderForm.stopLossPrice}` : '$100,000'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Additional Info Section */}
        <View style={styles.infoSection}>
          {/* Estimated execution time */}
          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text style={styles.infoLabel}>Estimated execution time</Text>
              <TouchableOpacity style={styles.infoIcon}>
                <Icon name={IconName.Info} size={IconSize.Xss} color={IconColor.Muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoValue}>~15 seconds</Text>
          </View>

          {/* Margin */}
          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text style={styles.infoLabel}>Margin</Text>
              <TouchableOpacity style={styles.infoIcon}>
                <Icon name={IconName.Info} size={IconSize.Xss} color={IconColor.Muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoValue}>
              {marginRequired ? `$${marginRequired}` : '--'}
            </Text>
          </View>

          {/* Liquidation price */}
          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text style={styles.infoLabel}>Liquidation price</Text>
            </View>
            <Text style={styles.infoValue}>
              {parseFloat(orderForm.amount) > 0 ? `$${liquidationPrice}` : '--'}
            </Text>
          </View>

          {/* Fees */}
          <View style={styles.infoRow}>
            <View style={styles.detailLeft}>
              <Text style={styles.infoLabel}>Fees</Text>
              <TouchableOpacity style={styles.infoIcon}>
                <Icon name={IconName.Info} size={IconSize.Xss} color={IconColor.Muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoValue}>
              {parseFloat(orderForm.amount) > 0 ? `$${estimatedFees}` : '--'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Debug Panel - Only visible in development */}
      {__DEV__ && (
        <View style={styles.debugPanel}>
          <View style={styles.debugPanelHeader}>
            <Text style={styles.debugPanelTitle}>🧪 Debug Panel</Text>
            <TouchableOpacity onPress={() => setDebugPanelVisible(!isDebugPanelVisible)}>
              <Text style={styles.debugToggle}>
                {isDebugPanelVisible ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {isDebugPanelVisible && (
            <>
              {/* SDK Method Toggle */}
              <View style={styles.debugRow}>
                <Text style={styles.debugLabel}>SDK Method:</Text>
                <View style={styles.debugButtonRow}>
                  <TouchableOpacity
                    style={[styles.debugButton, { backgroundColor: useSDKSignL1 ? colors.primary.default : colors.background.default }]}
                    onPress={() => setUseSDKSignL1(true)}
                  >
                    <Text style={[styles.debugButtonText, { color: useSDKSignL1 ? colors.primary.inverse : colors.text.muted }]}>
                      signL1Action
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.debugButton, { backgroundColor: !useSDKSignL1 ? colors.primary.default : colors.background.default }]}
                    onPress={() => setUseSDKSignL1(false)}
                  >
                    <Text style={[styles.debugButtonText, { color: !useSDKSignL1 ? colors.primary.inverse : colors.text.muted }]}>
                      exchange.order
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Test Buttons */}
              <TouchableOpacity
                style={styles.debugTestButton}
                onPress={useSDKSignL1 ? testDirectWalletSignL1Action : testDirectWalletExchangeOrder}
                disabled={isPlacingOrder}
              >
                <Text style={styles.debugTestButtonText}>
                  👤 TEST Direct Wallet {useSDKSignL1 ? 'signL1Action' : 'exchange.order'} ($11 BTC)
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}


      {/* Place Order Button */}
      <View style={styles.footer}>
        {orderValidation.errors.length > 0 && (
          <View style={styles.validationContainer}>
            {orderValidation.errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>{error}</Text>
            ))}
          </View>
        )}
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={`${orderForm.direction === 'long' ? 'Long' : 'Short'} BTC`}
          onPress={handlePlaceOrder}
          disabled={!orderValidation.isValid || isPlacingOrder || orderValidation.errors.length > 0}
          loading={isPlacingOrder}
        />
      </View>

      {/* TP/SL Modal */}
      <PerpsTPSLModal
        isVisible={isTpSlModalVisible}
        onClose={() => setTpSlModalVisible(false)}
        onConfirm={(tpPrice, slPrice) => {
          // Store absolute prices directly - no conversion needed
          setOrderForm(prev => ({
            ...prev,
            takeProfitPrice: tpPrice ? tpPrice.toString() : undefined,
            stopLossPrice: slPrice ? slPrice.toString() : undefined,
          }));
        }}
        currentPrice={assetData.price}
        direction={orderForm.direction}
        initialTakeProfitPrice={takeProfitPrice}
        initialStopLossPrice={stopLossPrice}
      />

      {/* Bottom Sheet Components */}
      {isOrderTypeBottomSheetVisible && (
        <PerpsOrderTypeBottomSheet
          ref={orderTypeBottomSheetRef}
          selectedType={orderType}
          onSelectType={(type) => {
            setOrderType(type);
            setIsOrderTypeBottomSheetVisible(false);
          }}
          onClose={() => setIsOrderTypeBottomSheetVisible(false)}
        />
      )}

      {isLeverageBottomSheetVisible && (
        <PerpsLeverageBottomSheet
          ref={leverageBottomSheetRef}
          leverage={orderForm.leverage}
          onLeverageChange={(leverage) => {
            setOrderForm(prev => ({ ...prev, leverage }));
            setIsLeverageBottomSheetVisible(false);
          }}
          onClose={() => setIsLeverageBottomSheetVisible(false)}
          maxLeverage={marketData?.maxLeverage || RISK_MANAGEMENT.fallbackMaxLeverage}
        />
      )}
    </SafeAreaView>
  );
};

export default PerpsOrderView;
