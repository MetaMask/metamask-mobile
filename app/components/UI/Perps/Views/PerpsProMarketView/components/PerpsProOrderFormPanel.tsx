import { Box } from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import type { PerpsMarketData } from '@metamask/perps-controller';
import React from 'react';
import { Modal, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsBottomSheetTooltip from '../../../components/PerpsBottomSheetTooltip';
import PerpsLeverageBottomSheet from '../../../components/PerpsLeverageBottomSheet';
import PerpsOrderTypeBottomSheetView from '../../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView';
import PerpsSlippageBottomSheet from '../../../components/PerpsSlippageBottomSheet';
import { PerpsOrderProvider } from '../../../contexts/PerpsOrderContext';
import PerpsProOrderForm from './PerpsProOrderForm/PerpsProOrderForm';
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

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL}
      twClassName="flex-1 py-4"
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
      <PerpsOrderTypeBottomSheetView
        isVisible={isOrderTypeVisible}
        onClose={closeOrderType}
        onSelect={onOrderTypeSelect}
        currentOrderType={orderType}
        title={strings('perps.pro_order_form.choose_order_type')}
        showSelectedIcon
      />
      <PerpsLeverageBottomSheet
        isVisible={isLeverageVisible}
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
      <PerpsSlippageBottomSheet
        isVisible={isSlippageVisible}
        currentValueBps={maxSlippageBps}
        onClose={closeSlippage}
        onSave={onSlippageSave}
      />
      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={closeTooltip}
          contentKey={selectedTooltip}
          key={selectedTooltip}
          buttonLocation={PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_ASSET_SCREEN}
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
      )}
      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
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

const PerpsProOrderFormPanel = ({ market }: PerpsProOrderFormPanelProps) => (
  <PerpsOrderProvider initialAsset={market.symbol}>
    <PerpsProOrderFormContent market={market} />
  </PerpsOrderProvider>
);

export default PerpsProOrderFormPanel;
