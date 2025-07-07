import React, { useState, useMemo, useCallback, useContext } from 'react';
import { useNavigation, useRoute, type NavigationProp, type ParamListBase, type RouteProp } from '@react-navigation/native';
import { SafeAreaView, StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import ButtonIcon, { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon';
import Text from '../../../../component-library/components/Texts/Text';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { IconName, IconColor } from '../../../../component-library/components/Icons/Icon';
import { ToastContext, ToastVariants } from '../../../../component-library/components/Toast';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { usePerpsController, usePerpsAccountState, usePerpsNetwork, usePerpsPrices } from '../hooks';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import PerpsTPSLModal from '../components/PerpsTPSLModal';

// Order form state interface
interface OrderFormState {
  asset: string;
  direction: 'long' | 'short';
  amount: string;
  leverage: number;
  balancePercent: number; // Percentage of available balance being used
  takeProfitPercent?: number;
  stopLossPercent?: number;
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
    marginSliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    marginBadge: {
      backgroundColor: colors.primary.default,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 16,
    },
    marginBadgeText: {
      color: colors.primary.inverse,
      fontSize: 14,
      fontWeight: '600',
    },
    marginTrack: {
      flex: 1,
      height: 4,
      backgroundColor: colors.background.alternative,
      borderRadius: 2,
      position: 'relative',
    },
    marginProgress: {
      height: 4,
      backgroundColor: colors.primary.default,
      borderRadius: 2,
      maxWidth: '100%',
    },
    sliderContainer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    sliderTrack: {
      height: 4,
      backgroundColor: colors.background.alternative,
      borderRadius: 2,
      marginTop: 8,
    },
    sliderThumb: {
      width: 20,
      height: 20,
      backgroundColor: colors.primary.default,
      borderRadius: 10,
      position: 'absolute',
      top: -8,
      marginLeft: -10,
    },
    orderDetails: {
      paddingHorizontal: 24,
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
    sliderPercentageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    sliderPercentageText: {
      color: colors.text.muted,
      fontSize: 12,
    },
  });

const PerpsOrderView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: OrderRouteParams }, 'params'>>();
  const { toastRef } = useContext(ToastContext);

  // Get navigation params
  const {
    direction = 'long',
    asset = 'BTC',
    amount: paramAmount,
    leverage: paramLeverage
  } = route.params || {};

  // Get PerpsController methods and state
  const { placeOrder } = usePerpsController();
  const currentNetwork = usePerpsNetwork();
  const cachedAccountState = usePerpsAccountState();

  // Get real HyperLiquid USDC balance
  const availableBalance = parseFloat(cachedAccountState?.availableBalance?.toString() || '0');

  // Calculate initial balance percentage
  const defaultAmount = parseFloat(currentNetwork === 'mainnet' ? '6' : '11');
  const defaultLeverage = 2;
  const initialMarginRequired = defaultAmount / defaultLeverage;
  const initialBalancePercent = availableBalance > 0 ?
    Math.min((initialMarginRequired / availableBalance) * 100, 100) : 0.1; // Default to 0.1% if no balance

  // Determine default amount - priority: route params > network defaults
  const defaultAmountValue = paramAmount || (currentNetwork === 'mainnet' ? '6' : '11');
  const defaultLeverageValue = paramLeverage || 2;

  // Order form state - Initialize with navigation params
  const [orderForm, setOrderForm] = useState<OrderFormState>({
    asset,
    direction,
    amount: defaultAmountValue,
    leverage: defaultLeverageValue,
    balancePercent: Math.round(initialBalancePercent * 100) / 100, // Calculate based on actual balance
    takeProfitPercent: 30,
    stopLossPercent: 10,
  });

  // Memoize the asset array to prevent re-subscriptions
  const assetSymbols = useMemo(() => [orderForm.asset], [orderForm.asset]);

  // Get real-time price data for the asset (after orderForm is defined)
  const priceData = usePerpsPrices(assetSymbols);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isTpSlModalVisible, setTpSlModalVisible] = useState(false);
  const [isOrderTypeModalVisible, setOrderTypeModalVisible] = useState(false);
  const [isLeverageModalVisible, setLeverageModalVisible] = useState(false);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');

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

  // Calculate estimated fees (typically 0.02% for market orders on most perps platforms)
  const estimatedFees = useMemo(() => {
    const amount = parseFloat(orderForm.amount || '0');
    const feeRate = orderType === 'market' ? 0.0002 : 0.0001; // Market: 0.02%, Limit: 0.01%
    return (amount * feeRate).toFixed(2);
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
    // Maintenance margin is typically 5% for most perps
    const maintenanceMargin = 0.05;
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

  // Calculate take profit and stop loss prices based on percentages
  const takeProfitPrice = useMemo(() => {
    if (!orderForm.takeProfitPercent || assetData.price === 0) return undefined;

    if (orderForm.direction === 'long') {
      return assetData.price * (1 + orderForm.takeProfitPercent / 100);
    }
    return assetData.price * (1 - orderForm.takeProfitPercent / 100);
  }, [orderForm.takeProfitPercent, assetData.price, orderForm.direction]);

  const stopLossPrice = useMemo(() => {
    if (!orderForm.stopLossPercent || assetData.price === 0) return undefined;

    if (orderForm.direction === 'long') {
      return assetData.price * (1 - orderForm.stopLossPercent / 100);
    }
    return assetData.price * (1 + orderForm.stopLossPercent / 100);
  }, [orderForm.stopLossPercent, assetData.price, orderForm.direction]);

  // Order validation
  const orderValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate amount
    const amount = parseFloat(orderForm.amount || '0');
    if (amount <= 0) {
      errors.push(strings('perps.order.validation.amountRequired'));
    }

    // Validate minimum order size (example: $10 minimum)
    if (amount > 0 && amount < 10) {
      errors.push(strings('perps.order.validation.minimumAmount', { amount: '10' }));
    }

    // Validate maximum order size (example: $100,000 maximum)
    if (amount > 100000) {
      errors.push(strings('perps.order.validation.maximumAmount', { amount: '100,000' }));
    }

    // Check if user has sufficient balance for margin
    const requiredMargin = parseFloat(marginRequired);
    const mockBalance = 4000; // Mock balance - in real implementation get from controller

    if (requiredMargin > mockBalance) {
      errors.push(strings('perps.order.validation.insufficientBalance', { required: marginRequired, available: mockBalance.toString() }));
    }

    // Validate leverage
    if (orderForm.leverage < 1 || orderForm.leverage > 100) {
      errors.push(strings('perps.order.validation.invalidLeverage', { min: '1', max: '100' }));
    }

    // Warn about high leverage
    if (orderForm.leverage > 20) {
      warnings.push(strings('perps.order.validation.highLeverageWarning'));
    }

    // Validate TP/SL levels
    if (takeProfitPrice && stopLossPrice) {
      if (orderForm.direction === 'long') {
        if (takeProfitPrice <= assetData.price) {
          errors.push(strings('perps.order.validation.invalidTakeProfit', { direction: 'above', positionType: 'long' }));
        }
        if (stopLossPrice >= assetData.price) {
          errors.push(strings('perps.order.validation.invalidStopLoss', { direction: 'below', positionType: 'long' }));
        }
      } else if (takeProfitPrice >= assetData.price) {
        errors.push(strings('perps.order.validation.invalidTakeProfit', { direction: 'below', positionType: 'short' }));
      }
      if (stopLossPrice <= assetData.price) {
        errors.push(strings('perps.order.validation.invalidStopLoss', { direction: 'above', positionType: 'short' }));
      }
    }

    // Check liquidation proximity
    const liquidationPriceNum = parseFloat(liquidationPrice);
    const priceDistance = Math.abs(liquidationPriceNum - assetData.price) / assetData.price;

    if (priceDistance < 0.1) { // Less than 10% from liquidation
      warnings.push(strings('perps.order.validation.liquidationWarning'));
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  }, [orderForm, marginRequired, takeProfitPrice, stopLossPrice, assetData.price, liquidationPrice]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);


  // Handle order type toggle
  const handleOrderTypeToggle = useCallback(() => {
    setOrderTypeModalVisible(true);
  }, []);

  // Handle leverage settings
  const handleLeverageSettings = useCallback(() => {
    setLeverageModalVisible(true);
  }, []);

  // Handle balance percentage slider
  const handleBalancePercentageChange = useCallback((percentage: number) => {
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const marginToUse = (availableBalance * clampedPercentage) / 100;
    const newAmount = marginToUse * orderForm.leverage;

    setOrderForm(prev => ({
      ...prev,
      amount: newAmount.toFixed(2),
      balancePercent: clampedPercentage
    }));
  }, [availableBalance, orderForm.leverage]);

  // Handle amount change
  const handleAmountChange = useCallback((text: string) => {
    // Only allow numbers and decimal point
    const cleanText = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleanText.split('.');
    const validText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanText;
    // Calculate the new balance percentage based on amount
    const amount = parseFloat(validText || '0');
    const requiredMargin = amount / orderForm.leverage;
    const newBalancePercent = availableBalance > 0 && requiredMargin > 0 ?
      Math.min((requiredMargin / availableBalance) * 100, 100) : 0;

    setOrderForm(prev => ({
      ...prev,
      amount: validText,
      balancePercent: Math.round(newBalancePercent * 100) / 100 // Round to 2 decimal places
    }));
  }, [orderForm.leverage, availableBalance]);


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
        takeProfitPrice: takeProfitPrice?.toString(),
        stopLossPrice: stopLossPrice?.toString(),
      };

      const result = await placeOrder(orderParams);

      if (result.success) {
        DevLogger.log('PerpsOrderView: Order placed successfully', result);

        // Show success toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            { label: strings('perps.order.success.orderPlaced'), isBold: true },
            { label: ' - ', isBold: false },
            { label: `${orderForm.direction.toUpperCase()} ${orderForm.asset}`, isBold: true }
          ],
          iconName: IconName.CheckBold,
          iconColor: IconColor.Success,
          hasNoTimeout: false,
        });

        navigation.navigate(Routes.PERPS.ORDER_SUCCESS, {
          asset: orderForm.asset,
          direction: orderForm.direction,
          amount: orderForm.amount,
          orderId: result.orderId,
        });
      } else {
        DevLogger.log('PerpsOrderView: Order failed', result);

        // Show error toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            { label: strings('perps.order.error.placementFailed'), isBold: true },
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
          { label: strings('perps.order.error.networkError'), isBold: true },
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
  }, [orderForm, positionSize, marginRequired, liquidationPrice, placeOrder, navigation, orderValidation, takeProfitPrice, stopLossPrice, toastRef]);

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
        {/* Amount Section */}
        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInputWithDollar}
              value={`$${orderForm.amount}`}
              onChangeText={(text) => {
                // Remove $ symbol and any non-numeric characters except decimal
                const cleanText = text.replace(/[$]/g, '').replace(/[^0-9.]/g, '');
                handleAmountChange(cleanText);
              }}
              keyboardType="numeric"
              placeholder={`$${currentNetwork === 'mainnet' ? '11' : '6'}`}
              placeholderTextColor={colors.text.muted}
            />
          </View>
          <Text style={styles.btcAmountText}>{positionSize} BTC</Text>
        </View>

        {/* Balance Percentage Slider */}
        <View style={styles.sliderContainer}>
          <View style={styles.marginSliderContainer}>
            <TouchableOpacity style={styles.marginBadge}>
              <Text style={styles.marginBadgeText}>{orderForm.balancePercent.toFixed(1)}%</Text>
            </TouchableOpacity>
            <View style={styles.marginTrack}>
              <View style={[styles.marginProgress, { width: `${orderForm.balancePercent}%` }]} />
            </View>
          </View>
          <View style={styles.sliderPercentageRow}>
            <TouchableOpacity onPress={() => handleBalancePercentageChange(0)}>
              <Text style={styles.sliderPercentageText}>0%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBalancePercentageChange(25)}>
              <Text style={styles.sliderPercentageText}>25%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBalancePercentageChange(50)}>
              <Text style={styles.sliderPercentageText}>50%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBalancePercentageChange(75)}>
              <Text style={styles.sliderPercentageText}>75%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBalancePercentageChange(100)}>
              <Text style={styles.sliderPercentageText}>100%</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <View style={styles.marginLabelContainer}>
              <Text style={styles.detailLabel}>Margin required</Text>
              <ButtonIcon
                iconName={IconName.ArrowUp}
                iconColor={IconColor.Muted}
                style={styles.actionButton}
                size={ButtonIconSizes.Sm}
              />
            </View>
            <Text style={styles.detailValue}>${marginRequired}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Leverage</Text>
            <View style={styles.detailRowContainer}>
              <View style={styles.leverageContainer}>
                <TouchableOpacity
                  style={[
                    styles.leverageButton,
                    orderForm.leverage === 2 && styles.leverageButtonSelected
                  ]}
                  onPress={() => setOrderForm(prev => ({ ...prev, leverage: 2 }))}
                >
                  <Text style={[
                    styles.leverageButtonText,
                    orderForm.leverage === 2 && styles.leverageButtonTextSelected
                  ]}>
                    2x
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.leverageButton,
                    orderForm.leverage === 10 && styles.leverageButtonSelected
                  ]}
                  onPress={() => setOrderForm(prev => ({ ...prev, leverage: 10 }))}
                >
                  <Text style={[
                    styles.leverageButtonText,
                    orderForm.leverage === 10 && styles.leverageButtonTextSelected
                  ]}>
                    10x
                  </Text>
                </TouchableOpacity>
              </View>
              <ButtonIcon
                iconName={IconName.Setting}
                iconColor={IconColor.Muted}
                style={styles.actionButton}
                size={ButtonIconSizes.Sm}
                onPress={handleLeverageSettings}
              />
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Liquidation price</Text>
            <Text style={styles.detailValue}>${liquidationPrice}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Take profit/Stop loss</Text>
            <TouchableOpacity onPress={() => setTpSlModalVisible(true)}>
              <Text style={styles.addButton}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.bottomRow}>
            <Text style={styles.bottomLabel}>Balance</Text>
            <Text style={styles.bottomValue}>
              {availableBalance > 0 ? `${availableBalance.toLocaleString()} USDC` : 'Loading...'}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.bottomLabel}>Fees</Text>
            <Text style={styles.bottomValue}>${estimatedFees}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <TouchableOpacity
        style={[
          styles.placeOrderButton,
          !orderValidation.isValid && styles.placeOrderButtonDisabled
        ]}
        onPress={handlePlaceOrder}
        disabled={!orderValidation.isValid || isPlacingOrder}
      >
        <Text style={[
          styles.placeOrderButtonText,
          !orderValidation.isValid && styles.placeOrderButtonTextDisabled
        ]}>
          {orderValidation.isValid ? 'Place order' : `Cannot place order (${orderValidation.errors.length} errors)`}
        </Text>
      </TouchableOpacity>

      {/* TP/SL Modal */}
      <PerpsTPSLModal
        isVisible={isTpSlModalVisible}
        onClose={() => setTpSlModalVisible(false)}
        onConfirm={(tpPrice, slPrice) => {
          // Convert prices back to percentages for state management
          const tpPercent = tpPrice ?
            (Math.abs(tpPrice - assetData.price) / assetData.price) * 100 : undefined;
          const slPercent = slPrice ?
            (Math.abs(slPrice - assetData.price) / assetData.price) * 100 : undefined;

          setOrderForm(prev => ({
            ...prev,
            takeProfitPercent: tpPercent,
            stopLossPercent: slPercent,
          }));
        }}
        currentPrice={assetData.price}
        direction={orderForm.direction}
        initialTakeProfitPrice={takeProfitPrice}
        initialStopLossPrice={stopLossPrice}
      />

      {/* Order Type Modal */}
      {isOrderTypeModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Order Type
            </Text>
            <TouchableOpacity
              style={[styles.modalOption, orderType === 'market' && styles.modalOptionSelected]}
              onPress={() => { setOrderType('market'); setOrderTypeModalVisible(false); }}
            >
              <Text style={[styles.modalOptionText, orderType === 'market' && styles.modalOptionTextSelected]}>
                Market
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOption, orderType === 'limit' && styles.modalOptionSelected]}
              onPress={() => { setOrderType('limit'); setOrderTypeModalVisible(false); }}
            >
              <Text style={[styles.modalOptionText, orderType === 'limit' && styles.modalOptionTextSelected]}>
                Limit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setOrderTypeModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Leverage Modal */}
      {isLeverageModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Leverage Settings
            </Text>
            {[1, 2, 5, 10, 20, 50].map(leverage => (
              <TouchableOpacity
                key={leverage}
                style={[
                  styles.modalOption,
                  orderForm.leverage === leverage && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setOrderForm(prev => ({ ...prev, leverage }));
                  setLeverageModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  orderForm.leverage === leverage && styles.modalOptionTextSelected
                ]}>
                  {leverage}x
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setLeverageModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PerpsOrderView;

