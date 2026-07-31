import { Box } from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import type { PerpsMarketData } from '@metamask/perps-controller';
import React from 'react';
import { Modal, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsBottomSheetTooltip from '../../../components/PerpsBottomSheetTooltip';
import PerpsLeverageBottomSheet from '../../../components/PerpsLeverageBottomSheet';
import PerpsOrderTypeBottomSheetView from '../../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView';
import PerpsSlippageBottomSheet from '../../../components/PerpsSlippageBottomSheet';
import { PerpsOrderProvider } from '../../../contexts/PerpsOrderContext';
import PerpsProOrderForm from './PerpsProOrderForm/PerpsProOrderForm';
import { createStyles } from './PerpsProOrderFormPanel.styles';
import { usePerpsProOrderForm } from './PerpsProOrderForm/usePerpsProOrderForm';

export interface PerpsProOrderFormPanelProps {
  market: PerpsMarketData;
  isOrderBookCollapsed?: boolean;
  onExpandOrderBook?: () => void;
}

const PerpsProOrderFormContent = ({
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
    onUseMidPricePress,
    size,
    onSizeChange,
    balancePercentage,
    onBalancePercentageChange,
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

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL}
      collapsable={false}
      style={[
        styles.panel,
        !isOrderBookCollapsed && styles.panelWithBookSeparator,
      ]}
    >
      <PerpsProOrderForm
        direction={direction}
        onDirectionChange={onDirectionChange}
        isOrderBookCollapsed={isOrderBookCollapsed}
        onExpandOrderBook={onExpandOrderBook}
        marginModeLabel={strings('perps.pro_order_form.isolated')}
        leverageLabel={`${leverage}x`}
        onLeveragePress={onLeveragePress}
        orderType={orderType}
        onOrderTypeButtonPress={onOrderTypeButtonPress}
        limitPrice={limitPrice}
        onLimitPriceChange={onLimitPriceChange}
        onUseMidPricePress={onUseMidPricePress}
        size={size}
        onSizeChange={onSizeChange}
        balancePercentage={balancePercentage}
        onBalancePercentageChange={onBalancePercentageChange}
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
        sheet in a react-native <Modal> renders it from the root at full width;
        the <View> wrapper is required for correct Android rendering (see the
        PerpsBottomSheetTooltip docstring). Context still flows through the Modal.
      */}
      {isOrderTypeVisible && (
        <View>
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
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
          </Modal>
        </View>
      )}
      {isLeverageVisible && (
        <View>
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
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
          </Modal>
        </View>
      )}
      {isSlippageVisible && (
        <View>
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeSlippage}
          >
            <PerpsSlippageBottomSheet
              isVisible
              currentValueBps={maxSlippageBps}
              onClose={closeSlippage}
              onSave={onSlippageSave}
            />
          </Modal>
        </View>
      )}
      {selectedTooltip && (
        <View>
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeTooltip}
          >
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
          </Modal>
        </View>
      )}
      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={closeEligibilityModal}
          >
            <PerpsBottomSheetTooltip
              isVisible
              onClose={closeEligibilityModal}
              contentKey={'geo_block'}
            />
          </Modal>
        </View>
      )}
    </Box>
  );
};

const PerpsProOrderFormPanel = ({
  market,
  isOrderBookCollapsed,
  onExpandOrderBook,
}: PerpsProOrderFormPanelProps) => (
  <PerpsOrderProvider
    key={market.symbol}
    initialAsset={market.symbol}
    initialType="market"
  >
    <PerpsProOrderFormContent
      market={market}
      isOrderBookCollapsed={isOrderBookCollapsed}
      onExpandOrderBook={onExpandOrderBook}
    />
  </PerpsOrderProvider>
);

export default PerpsProOrderFormPanel;
