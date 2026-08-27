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
import {
  selectPerpsProTriggeredOrdersEnabledFlag,
  selectPerpsProTwapEnabledFlag,
} from '../../../selectors/featureFlags';
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
const TWAP_SUPPORTED_PROVIDER: PerpsProviderType = 'hyperliquid';

export interface PerpsProOrderFormPanelProps {
  market: PerpsMarketData;
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
  const isTwapRolloutEnabled = isProModeActive && isTwapFlagEnabled;
  const { isLoadingOrderCapabilities, orderCapabilities, supportsTwapOrders } =
    usePerpsProvider(
      isTwapRolloutEnabled
        ? {
            symbol: market.symbol,
            providerId: market.providerId,
          }
        : undefined,
    );
  const resolvedTwapProviderId =
    orderCapabilities?.status === 'ready'
      ? orderCapabilities.providerId
      : undefined;
  // Controller v13 exposes executable strategy limits for Hyperliquid only.
  // Keep other providers undiscoverable until capabilities own their limits.
  const isTwapEnabled =
    isTwapRolloutEnabled &&
    supportsTwapOrders &&
    resolvedTwapProviderId === TWAP_SUPPORTED_PROVIDER;
  const isTwapAvailabilityPending =
    isTwapRolloutEnabled && isLoadingOrderCapabilities;
  const areTriggeredOrdersEnabled = isProModeActive && isTriggeredOrdersEnabled;
  const availableOrderTypes = useMemo<readonly OrderType[]>(
    () => [
      ...BASIC_ORDER_TYPES,
      ...(areTriggeredOrdersEnabled ? TRIGGERED_ORDER_TYPES : []),
      ...(isTwapEnabled ? TWAP_ORDER_TYPES : []),
    ],
    [areTriggeredOrdersEnabled, isTwapEnabled],
  );
  const {
    direction,
    onDirectionChange,
    leverage,
    onLeveragePress,
    orderType,
    onOrderTypeButtonPress,
    limitPrice,
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
    resolvedTwapProviderId,
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

  // One instance per field rather than a single shared handler: each keeps its
  // own card measurement and stays inert unless its own field holds focus, so
  // moving between fields needs no hand-off. The measured card here is the
  // order-type card, which wraps the limit price row.
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
        onOrderTypeButtonPress={onOrderTypeButtonPress}
        limitPrice={limitPrice}
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
            showSelectedIcon
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
            isVisible
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
