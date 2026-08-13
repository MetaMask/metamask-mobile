import { Box } from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import type { PerpsMarketData } from '@metamask/perps-controller';
import React, { useCallback, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsBottomSheetTooltip from '../../../components/PerpsBottomSheetTooltip';
import PerpsLeverageBottomSheet from '../../../components/PerpsLeverageBottomSheet';
import PerpsMarginModeBottomSheet from '../../../components/PerpsMarginModeBottomSheet';
import PerpsOrderTypeBottomSheetView from '../../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView';
import PerpsSlippageBottomSheet from '../../../components/PerpsSlippageBottomSheet';
import PerpsProModalPortal from './PerpsProModalPortal';
import PerpsProOrderForm from './PerpsProOrderForm/PerpsProOrderForm';
import { createStyles } from './PerpsProOrderFormPanel.styles';
import { usePerpsProOrderForm } from './PerpsProOrderForm/usePerpsProOrderForm';

export interface PerpsProOrderFormPanelProps {
  market: PerpsMarketData;
  isOrderBookCollapsed?: boolean;
  onExpandOrderBook?: () => void;
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
}: PerpsProOrderFormPanelProps) => {
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
    sizeInput,
    sizeSlider,
    availableBalance,
    onAddFundsPress,
    reduceOnly,
    onReduceOnlyChange,
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
  } = usePerpsProOrderForm({ market });

  const { styles } = useStyles(createStyles, {});

  const [isMarginModeVisible, setIsMarginModeVisible] = useState(false);
  const openMarginMode = useCallback(() => setIsMarginModeVisible(true), []);
  const closeMarginMode = useCallback(() => setIsMarginModeVisible(false), []);

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
        onLimitPriceBlur={onLimitPriceBlur}
        onUseMidPricePress={onUseMidPricePress}
        sizeInput={sizeInput}
        sizeSlider={sizeSlider}
        availableBalance={availableBalance}
        onAddFundsPress={onAddFundsPress}
        reduceOnly={reduceOnly}
        onReduceOnlyChange={onReduceOnlyChange}
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
          <PerpsOrderTypeBottomSheetView
            isVisible
            onClose={closeOrderType}
            onSelect={onOrderTypeSelect}
            currentOrderType={orderType}
            title={strings('perps.pro_order_form.choose_order_type')}
            showSelectedIcon
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
            orderType={orderType}
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
