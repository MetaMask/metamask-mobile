import { Box } from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import type {
  OrderType,
  PerpsMarketData,
  PerpsProviderType,
} from '@metamask/perps-controller';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsBottomSheetTooltip from '../../../components/PerpsBottomSheetTooltip';
import PerpsLeverageBottomSheet from '../../../components/PerpsLeverageBottomSheet';
import PerpsMarginModeBottomSheet from '../../../components/PerpsMarginModeBottomSheet';
import PerpsOrderTypeBottomSheet from '../../../components/PerpsOrderTypeBottomSheet';
import PerpsSlippageBottomSheet from '../../../components/PerpsSlippageBottomSheet';
import { PROVIDER_CONFIG } from '../../../constants/perpsConfig';
import {
  selectPerpsMobileScaleEnabledFlag,
  selectPerpsMobileChaseEnabledFlag,
  selectPerpsProTriggeredOrdersEnabledFlag,
  selectPerpsProTwapEnabledFlag,
} from '../../../selectors/featureFlags';
import { selectPerpsProvider } from '../../../selectors/perpsController';
import { usePerpsProvider } from '../../../hooks/usePerpsProvider';
import { useIsPerpsProModeActive } from '../../../utils/perpsModeSwitch';
import PerpsProModalPortal from './PerpsProModalPortal';
import PerpsProOrderForm from './PerpsProOrderForm/PerpsProOrderForm';
import PerpsProTwapDurationBottomSheet from './PerpsProOrderForm/PerpsProTwapDurationBottomSheet';
import { createStyles } from './PerpsProOrderFormPanel.styles';
import { usePerpsProOrderForm } from './PerpsProOrderForm/usePerpsProOrderForm';
import { usePerpsProKeyboardScroll } from './PerpsProOrderForm/usePerpsProKeyboardScroll';

const BASIC_ORDER_TYPES: readonly OrderType[] = ['market', 'limit'];
const TRIGGERED_ORDER_TYPES: readonly OrderType[] = [
  'stop_limit',
  'stop_market',
  'take_profit_limit',
  'take_profit_market',
];
const TWAP_ORDER_TYPES: readonly OrderType[] = ['twap'];
const SCALE_ORDER_TYPES: readonly OrderType[] = ['scale'];
const TWAP_SUPPORTED_PROVIDER: PerpsProviderType =
  PROVIDER_CONFIG.DefaultProvider;
const SCALE_SUPPORTED_PROVIDER: PerpsProviderType =
  PROVIDER_CONFIG.DefaultProvider;
const CHASE_ORDER_TYPES: readonly OrderType[] = ['chase'];

export interface PerpsProOrderFormPanelProps {
  market: PerpsMarketData;
  isScreenFocused?: boolean;
  isOrderBookCollapsed?: boolean;
  onExpandOrderBook?: () => void;
  onRequestScrollBy?: (delta: number) => void;
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

/**
 * Inline Pro order form.
 *
 * Must render within a `PerpsOrderProvider`. The provider is owned by
 * `PerpsProMarketView` so it wraps both this panel and the order book column,
 * letting an order-book row tap prefill the limit price here (TAT-3643).
 */
const PerpsProOrderFormPanel = ({
  market,
  isScreenFocused = true,
  isOrderBookCollapsed,
  onExpandOrderBook,
  onRequestScrollBy,
  scrollViewRef,
}: PerpsProOrderFormPanelProps) => {
  const isProModeActive = useIsPerpsProModeActive();
  const isTriggeredOrdersEnabled = useSelector(
    selectPerpsProTriggeredOrdersEnabledFlag,
  );
  const isTwapFlagEnabled = useSelector(selectPerpsProTwapEnabledFlag);
  const isScaleFlagEnabled = useSelector(selectPerpsMobileScaleEnabledFlag);
  const isChaseFlagEnabled = useSelector(selectPerpsMobileChaseEnabledFlag);
  const activeProvider = useSelector(selectPerpsProvider);
  const selectedProviderId =
    market.providerId ??
    (activeProvider === 'aggregated' ? undefined : activeProvider);
  const isScaleBaseEnabled = isProModeActive && isScaleFlagEnabled;
  const isChaseBaseEnabled = isProModeActive && isChaseFlagEnabled;
  const isTwapRolloutEnabled = isProModeActive && isTwapFlagEnabled;
  const {
    isLoadingOrderCapabilities,
    orderCapabilities,
    supportsTwapOrders,
    supportsScaleOrders,
    supportsChaseOrders,
    checkOrderCapability,
  } = usePerpsProvider(
    isScaleBaseEnabled || isTwapRolloutEnabled || isChaseBaseEnabled
      ? {
          symbol: market.symbol,
          providerId: selectedProviderId,
        }
      : undefined,
  );
  const resolvedProviderId =
    orderCapabilities?.status === 'ready'
      ? orderCapabilities.providerId
      : undefined;
  // Controller v13 exposes executable TWAP limits for Hyperliquid only.
  // Keep other providers undiscoverable until the capability contract owns
  // each provider's complete placement limits.
  const isTwapEnabled =
    isTwapRolloutEnabled &&
    supportsTwapOrders &&
    resolvedProviderId === TWAP_SUPPORTED_PROVIDER;
  const isTwapAvailabilityPending =
    isTwapRolloutEnabled && isLoadingOrderCapabilities;
  const resolvedScaleProviderId =
    resolvedProviderId === SCALE_SUPPORTED_PROVIDER
      ? resolvedProviderId
      : undefined;
  const isScaleOrdersEnabled =
    isScaleBaseEnabled &&
    supportsScaleOrders &&
    resolvedScaleProviderId !== undefined;
  const isScaleOrderSupportPending =
    isScaleBaseEnabled && isLoadingOrderCapabilities;
  const checkScaleOrderSupport = useCallback(
    () =>
      resolvedScaleProviderId
        ? checkOrderCapability('scale', resolvedScaleProviderId)
        : Promise.resolve(false),
    [checkOrderCapability, resolvedScaleProviderId],
  );
  const checkTwapOrderSupport = useCallback(
    () => checkOrderCapability('twap', resolvedProviderId),
    [checkOrderCapability, resolvedProviderId],
  );
  const areTriggeredOrdersEnabled = isProModeActive && isTriggeredOrdersEnabled;
  const chaseProviderId =
    isChaseBaseEnabled && supportsChaseOrders
      ? (resolvedProviderId ?? null)
      : null;
  const isChaseOrderEnabled = chaseProviderId !== null;
  const isChaseAvailabilityPending =
    isChaseBaseEnabled && isLoadingOrderCapabilities;
  const refreshChaseCapability = useCallback(async () => {
    if (
      !isChaseBaseEnabled ||
      !resolvedProviderId ||
      !(await checkOrderCapability('chase', resolvedProviderId))
    ) {
      return null;
    }
    return resolvedProviderId;
  }, [checkOrderCapability, isChaseBaseEnabled, resolvedProviderId]);
  const availableOrderTypes = useMemo<readonly OrderType[]>(
    () => [
      ...BASIC_ORDER_TYPES,
      ...(areTriggeredOrdersEnabled ? TRIGGERED_ORDER_TYPES : []),
      ...(isTwapEnabled ? TWAP_ORDER_TYPES : []),
      ...(isScaleOrdersEnabled ? SCALE_ORDER_TYPES : []),
      ...(isChaseOrderEnabled ? CHASE_ORDER_TYPES : []),
    ],
    [
      areTriggeredOrdersEnabled,
      isChaseOrderEnabled,
      isScaleOrdersEnabled,
      isTwapEnabled,
    ],
  );
  const {
    direction,
    onDirectionChange,
    leverage,
    onLeveragePress,
    orderType,
    activeChaseCount,
    onOrderTypeButtonPress,
    limitPrice,
    chaseMaxDistance,
    chaseMaxDistanceUnit,
    onChaseMaxDistanceUnitChange,
    chaseReferencePrice,
    onChaseMaxDistanceChange,
    onLimitPriceChange,
    onLimitPriceBlur,
    onUseMidPricePress,
    triggerPrice,
    onTriggerPriceChange,
    onTriggerPriceBlur,
    priceCardMessage,
    sizeInput,
    sizeSlider,
    availableBalance,
    onAddFundsPress,
    reduceOnly,
    onReduceOnlyChange,
    twap,
    isTPSLConfigured,
    onTPSLPress,
    notices,
    summary,
    scaleOrder,
    isPlaceOrderDisabled,
    isPlaceOrderLoading,
    onPlaceOrderPress,
    isLeverageVisible,
    minLeverage,
    maxLeverage,
    currentPrice,
    onLeverageConfirm,
    closeLeverage,
    isSlippageVisible,
    maxSlippageBps,
    onSlippageSave,
    closeSlippage,
    isOrderTypeVisible,
    onOrderTypeSelect,
    closeOrderType,
    isEligibilityModalVisible,
    closeEligibilityModal,
    selectedTooltip,
    closeTooltip,
    feeMetamaskFeeRate,
    feeProtocolFeeRate,
    feeOriginalMetamaskFeeRate,
    feeDiscountPercentage,
  } = usePerpsProOrderForm({
    market,
    isTriggeredOrdersEnabled: areTriggeredOrdersEnabled,
    isTwapEnabled,
    isTwapAvailabilityPending,
    resolvedTwapProviderId: resolvedProviderId,
    checkTwapOrderSupport,
    scaleProviderId: resolvedScaleProviderId,
    isScaleOrdersEnabled,
    isScaleOrderSupportPending,
    checkScaleOrderSupport,
    isChaseEnabled: isChaseOrderEnabled,
    isChaseAvailabilityPending,
    refreshChaseCapability,
    chaseProviderId,
    isScreenFocused,
  });

  const { styles } = useStyles(createStyles, {});

  const [isMarginModeVisible, setIsMarginModeVisible] = useState(false);
  const openMarginMode = useCallback(() => setIsMarginModeVisible(true), []);
  const closeMarginMode = useCallback(() => setIsMarginModeVisible(false), []);
  const [isTwapDurationVisible, setIsTwapDurationVisible] = useState(false);
  const openTwapDuration = useCallback(
    () => setIsTwapDurationVisible(true),
    [],
  );
  const closeTwapDuration = useCallback(
    () => setIsTwapDurationVisible(false),
    [],
  );

  useEffect(() => {
    if (orderType !== 'twap') {
      setIsTwapDurationVisible(false);
    }
  }, [orderType]);

  const {
    cardRef: sizeCardRef,
    onFocus: onSizeCardFocus,
    onBlur: onSizeCardBlur,
    realign: onSizeFieldPress,
  } = usePerpsProKeyboardScroll({ onRequestScrollBy, scrollViewRef });

  // Each Scale row owns its measurement so focus navigation can realign the
  // newly focused row instead of measuring the full four-row card.
  const scaleStartKeyboardScroll = usePerpsProKeyboardScroll({
    onRequestScrollBy,
    scrollViewRef,
  });
  const scaleEndKeyboardScroll = usePerpsProKeyboardScroll({
    onRequestScrollBy,
    scrollViewRef,
  });
  const scaleTotalOrdersKeyboardScroll = usePerpsProKeyboardScroll({
    onRequestScrollBy,
    scrollViewRef,
  });
  const scaleSizeSkewKeyboardScroll = usePerpsProKeyboardScroll({
    onRequestScrollBy,
    scrollViewRef,
  });

  // Limit and trigger share the order-type card because only one is visible.
  const {
    cardRef: orderTypeCardRef,
    onFocus: onLimitPriceFocus,
    onBlur: onLimitPriceCardBlur,
    realign: onLimitPriceFieldPress,
  } = usePerpsProKeyboardScroll({ onRequestScrollBy, scrollViewRef });

  // Composed, not replaced: the form's own handlers clear the slider preview
  // and drive the focused-size styling.
  const sizeInputWithKeyboardScroll = useMemo(
    () => ({
      ...sizeInput,
      onFocus: () => {
        sizeInput.onFocus();
        onSizeCardFocus();
      },
      onBlur: () => {
        sizeInput.onBlur();
        onSizeCardBlur();
      },
    }),
    [sizeInput, onSizeCardFocus, onSizeCardBlur],
  );

  // Likewise composed: the form's blur finalizes the typed limit price.
  const onLimitPriceBlurWithKeyboardScroll = useCallback(() => {
    onLimitPriceBlur();
    onLimitPriceCardBlur();
  }, [onLimitPriceBlur, onLimitPriceCardBlur]);

  const onTriggerPriceBlurWithKeyboardScroll = useCallback(() => {
    onTriggerPriceBlur();
    onLimitPriceCardBlur();
  }, [onTriggerPriceBlur, onLimitPriceCardBlur]);

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL}
      collapsable={false}
      style={styles.panel}
    >
      <PerpsProOrderForm
        direction={direction}
        onDirectionChange={onDirectionChange}
        isOrderBookCollapsed={isOrderBookCollapsed}
        onExpandOrderBook={onExpandOrderBook}
        marginModeLabel={strings('perps.pro_order_form.isolated')}
        onMarginModePress={openMarginMode}
        leverageLabel={`${leverage}x`}
        onLeveragePress={onLeveragePress}
        orderType={orderType}
        scaleOrder={scaleOrder}
        activeChaseCount={activeChaseCount}
        scaleKeyboardScroll={{
          startPrice: scaleStartKeyboardScroll,
          endPrice: scaleEndKeyboardScroll,
          totalOrders: scaleTotalOrdersKeyboardScroll,
          sizeSkew: scaleSizeSkewKeyboardScroll,
        }}
        onOrderTypeButtonPress={onOrderTypeButtonPress}
        limitPrice={limitPrice}
        chaseMaxDistance={chaseMaxDistance}
        chaseMaxDistanceUnit={chaseMaxDistanceUnit}
        onChaseMaxDistanceUnitChange={onChaseMaxDistanceUnitChange}
        chaseReferencePrice={chaseReferencePrice}
        onChaseMaxDistanceChange={onChaseMaxDistanceChange}
        onLimitPriceChange={onLimitPriceChange}
        onLimitPriceFocus={onLimitPriceFocus}
        onLimitPriceBlur={onLimitPriceBlurWithKeyboardScroll}
        orderTypeCardRef={orderTypeCardRef}
        onLimitPriceFieldPress={onLimitPriceFieldPress}
        onUseMidPricePress={onUseMidPricePress}
        triggerPrice={triggerPrice}
        onTriggerPriceChange={onTriggerPriceChange}
        onTriggerPriceFocus={onLimitPriceFocus}
        onTriggerPriceBlur={onTriggerPriceBlurWithKeyboardScroll}
        onTriggerPriceFieldPress={onLimitPriceFieldPress}
        priceCardMessage={priceCardMessage}
        sizeInput={sizeInputWithKeyboardScroll}
        sizeSlider={sizeSlider}
        sizeCardRef={sizeCardRef}
        onSizeFieldPress={onSizeFieldPress}
        availableBalance={availableBalance}
        onAddFundsPress={onAddFundsPress}
        reduceOnly={reduceOnly}
        onReduceOnlyChange={onReduceOnlyChange}
        twap={twap}
        onTwapDurationPress={openTwapDuration}
        isTPSLConfigured={isTPSLConfigured}
        onTPSLPress={onTPSLPress}
        notices={notices}
        summary={summary}
        placeOrderLabel={strings('perps.pro_order_form.place_order')}
        placeOrderIntent={direction}
        isPlaceOrderDisabled={isPlaceOrderDisabled}
        isPlaceOrderLoading={isPlaceOrderLoading}
        onPlaceOrderPress={onPlaceOrderPress}
      />
      {/*
        The order form is rendered inside the width-constrained left column of
        PerpsProMarketLayout. The design-system BottomSheet positions itself with
        `absolute inset-0`, so without a Modal it would be clipped to that column
        instead of overlaying the full screen (as it does in lite). Wrapping each
        sheet in PerpsProModalPortal renders it from the root at full width and
        supplies the Android-native gesture hierarchy required by BottomSheet
        and Slider gestures.
      */}
      {isOrderTypeVisible && (
        <PerpsProModalPortal
          animationType="fade"
          onRequestClose={closeOrderType}
        >
          <PerpsOrderTypeBottomSheet
            isVisible
            onClose={closeOrderType}
            onSelect={onOrderTypeSelect}
            currentOrderType={orderType}
            asset={market.symbol}
            direction={direction}
            title={strings('perps.pro_order_form.choose_order_type')}
            showOrderTypeIcons
            availableOrderTypes={availableOrderTypes}
          />
        </PerpsProModalPortal>
      )}
      {isTwapDurationVisible && orderType === 'twap' && (
        <PerpsProModalPortal
          animationType="fade"
          onRequestClose={closeTwapDuration}
        >
          <PerpsProTwapDurationBottomSheet
            twap={twap}
            onClose={closeTwapDuration}
          />
        </PerpsProModalPortal>
      )}
      {isLeverageVisible && (
        <PerpsProModalPortal
          animationType="fade"
          onRequestClose={closeLeverage}
        >
          <PerpsLeverageBottomSheet
            isVisible
            onClose={closeLeverage}
            onConfirm={onLeverageConfirm}
            leverage={leverage}
            minLeverage={minLeverage}
            maxLeverage={maxLeverage}
            currentPrice={currentPrice}
            direction={direction}
            asset={market.symbol}
            limitPrice={limitPrice}
            triggerPrice={triggerPrice}
            orderType={orderType}
            enableConfirmHaptics
          />
        </PerpsProModalPortal>
      )}
      {isSlippageVisible && (
        <PerpsProModalPortal
          animationType="fade"
          onRequestClose={closeSlippage}
        >
          <PerpsSlippageBottomSheet
            isVisible
            currentValueBps={maxSlippageBps}
            onClose={closeSlippage}
            onSave={onSlippageSave}
          />
        </PerpsProModalPortal>
      )}
      {selectedTooltip && (
        <PerpsProModalPortal animationType="fade" onRequestClose={closeTooltip}>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={closeTooltip}
            contentKey={selectedTooltip}
            key={selectedTooltip}
            buttonLocation={
              PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_ASSET_SCREEN
            }
            data={
              selectedTooltip === 'fees'
                ? {
                    metamaskFeeRate: feeMetamaskFeeRate,
                    protocolFeeRate: feeProtocolFeeRate,
                    originalMetamaskFeeRate: feeOriginalMetamaskFeeRate,
                    feeDiscountPercentage,
                  }
                : undefined
            }
          />
        </PerpsProModalPortal>
      )}
      {isEligibilityModalVisible && (
        <PerpsProModalPortal onRequestClose={closeEligibilityModal}>
          <PerpsBottomSheetTooltip
            isVisible
            onClose={closeEligibilityModal}
            contentKey={'geo_block'}
          />
        </PerpsProModalPortal>
      )}
      {isMarginModeVisible && (
        <PerpsProModalPortal
          animationType="fade"
          onRequestClose={closeMarginMode}
        >
          <PerpsMarginModeBottomSheet isVisible onClose={closeMarginMode} />
        </PerpsProModalPortal>
      )}
    </Box>
  );
};

export default PerpsProOrderFormPanel;
