import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PerpsClosePositionViewSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BottomSheetFooter,
  Button,
  ButtonSize,
  ButtonVariant,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import {
  getPerpsDisplaySymbol,
  isStrategyOrderType,
} from '@metamask/perps-controller';
import { usePerpsToasts } from '../../hooks';
import { usePerpsClosePositionForm } from '../../hooks/usePerpsClosePositionForm';
import {
  formatPositionSize,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { createStyles } from './PerpsClosePositionView.styles';
import PerpsOrderHeader from '../../components/PerpsOrderHeader';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsSlider from '../../components/PerpsSlider';
import PerpsValidationErrors from '../../components/PerpsValidationErrors';
import PerpsLimitPriceBottomSheet from '../../components/PerpsLimitPriceBottomSheet';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';
import PerpsSlippageBottomSheet from '../../components/PerpsSlippageBottomSheet';
import PerpsCloseSummary from '../../components/PerpsCloseSummary';
import PerpsSlippageRow from '../../components/PerpsSlippageRow';

const PerpsClosePositionView: React.FC = () => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const [isSlippageVisible, setIsSlippageVisible] = useState(false);

  const {
    position,
    isLong,
    currentPrice,
    szDecimals,
    isClosePositionLimitOrderEnabled,
    orderType,
    effectiveOrderType,
    selectOrderType,
    limitPrice,
    setLimitPrice,
    displayClosePercentage,
    liveCloseAmount,
    closeAmountUSDString,
    displayUSDString,
    isInputFocused,
    handleSliderValueChange,
    handleSliderDragEnd,
    handleSliderDragCancel,
    handleAmountPress,
    handleKeypadChange,
    handlePercentagePress,
    handleMaxPress,
    handleDonePress,
    confirmButtonProps,
    feeResults,
    rewardsState,
    summaryMargin,
    summaryPnl,
    summaryFees,
    receiveAmount,
    filteredErrors,
    isClosing,
    shouldOpenSlippage,
    maxSlippageBps,
    setMaxSlippage,
  } = usePerpsClosePositionForm({
    confirmButtonTestID:
      PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
  });

  const [isLimitPriceVisible, setIsLimitPriceVisible] = useState(false);
  const [isOrderTypeVisible, setIsOrderTypeVisible] = useState(false);

  // Auto-open limit price bottom sheet when switching to limit order
  useEffect(() => {
    if (effectiveOrderType === 'limit' && !limitPrice) {
      setIsLimitPriceVisible(true);
    }
  }, [effectiveOrderType, limitPrice]);

  useEffect(() => {
    if (shouldOpenSlippage) {
      setIsSlippageVisible(true);
    }
  }, [shouldOpenSlippage]);

  const Summary = (
    <PerpsCloseSummary
      totalMargin={summaryMargin}
      totalPnl={summaryPnl}
      totalFees={summaryFees}
      originalTotalFees={feeResults.undiscountedTotalFee}
      feeDiscountPercentage={rewardsState.feeDiscountPercentage}
      metamaskFeeRate={feeResults.metamaskFeeRate}
      protocolFeeRate={feeResults.protocolFeeRate}
      originalMetamaskFeeRate={feeResults.originalMetamaskFeeRate}
      receiveAmount={receiveAmount}
      shouldShowRewards={rewardsState.shouldShowRewardsRow}
      estimatedPoints={rewardsState.estimatedPoints}
      bonusBips={rewardsState.bonusBips}
      isLoadingFees={feeResults.isLoadingMetamaskFee}
      isLoadingRewards={rewardsState.isLoading}
      hasRewardsError={rewardsState.hasError}
      accountOptedIn={rewardsState.accountOptedIn}
      rewardsAccount={rewardsState.account}
      testIDs={{
        feesTooltip: PerpsClosePositionViewSelectorsIDs.FEES_TOOLTIP_BUTTON,
        receiveTooltip:
          PerpsClosePositionViewSelectorsIDs.YOU_RECEIVE_TOOLTIP_BUTTON,
        pointsTooltip: PerpsClosePositionViewSelectorsIDs.POINTS_TOOLTIP_BUTTON,
        marginValue: PerpsClosePositionViewSelectorsIDs.MARGIN_VALUE,
        feesValue: PerpsClosePositionViewSelectorsIDs.FEES_VALUE,
        receiveValue: PerpsClosePositionViewSelectorsIDs.RECEIVE_VALUE,
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <PerpsOrderHeader
        asset={position.symbol}
        price={currentPrice}
        title={strings('perps.close_position.title')}
        isLoading={isClosing}
        orderType={
          isClosePositionLimitOrderEnabled ? effectiveOrderType : undefined
        }
        onOrderTypePress={
          isClosePositionLimitOrderEnabled
            ? () => setIsOrderTypeVisible(true)
            : undefined
        }
      />

      <ScrollView
        style={styles.content}
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          isInputFocused && styles.scrollViewContentWithKeypad,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Display */}
        <PerpsAmountDisplay
          amount={displayUSDString}
          showWarning={false}
          onPress={handleAmountPress}
          isActive={isInputFocused}
          tokenAmount={formatPositionSize(liveCloseAmount, szDecimals)}
          hasError={filteredErrors.length > 0}
          tokenSymbol={position.symbol}
          showMaxAmount={false}
        />

        {/* Toggle Button for USD/Token Display */}
        <Box twClassName="items-center px-4 pt-0 pb-2">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {`${formatPositionSize(liveCloseAmount, szDecimals)} ${getPerpsDisplaySymbol(position.symbol)}`}
          </Text>
        </Box>

        {/* Slider - Hidden when keypad/input is focused */}
        {!isInputFocused && (
          <Box twClassName="px-4 py-4" onTouchCancel={handleSliderDragCancel}>
            <PerpsSlider
              value={displayClosePercentage}
              onValueChange={handleSliderValueChange}
              onDragEnd={handleSliderDragEnd}
              disabled={isClosing}
            />
          </Box>
        )}

        {/* Limit Price - only show for limit orders (still hidden during input to avoid overlap) */}
        {effectiveOrderType === 'limit' && !isInputFocused && (
          <Box twClassName="px-4 pb-0">
            <Box twClassName="bg-background-section rounded-xl overflow-hidden">
              <TouchableOpacity
                testID={PerpsClosePositionViewSelectorsIDs.LIMIT_PRICE_ROW}
                onPress={() => setIsLimitPriceVisible(true)}
              >
                <KeyValueRow
                  variant={KeyValueRowVariant.Input}
                  keyLabel={strings('perps.order.limit_price')}
                  value={
                    limitPrice
                      ? formatPerpsFiat(limitPrice, {
                          ranges: PRICE_RANGES_UNIVERSAL,
                        })
                      : strings('perps.order.set_price')
                  }
                />
              </TouchableOpacity>
            </Box>
          </Box>
        )}

        {/* Slippage - market closes use the same persisted setting as trades. */}
        {effectiveOrderType === 'market' && !isInputFocused && (
          <PerpsSlippageRow
            maxSlippageBps={maxSlippageBps}
            onPress={() => setIsSlippageVisible(true)}
            testID={PerpsClosePositionViewSelectorsIDs.SLIPPAGE_ROW}
          />
        )}

        {/* Order Details moved to footer summary */}

        {/* Validation Messages - keep visible while typing */}
        {/* Filter the errors and only show minimum $10 error */}
        <PerpsValidationErrors errors={filteredErrors} />
      </ScrollView>

      {/* Keypad Section - Show when input is focused; keep summary and slider above */}
      {isInputFocused && (
        <Box twClassName="pt-4">
          {/* Summary shown above keypad while editing */}
          {Summary}
          <Box twClassName="flex-row justify-between px-4 mb-3 gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.25)}
              twClassName="flex-1"
            >
              25%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.5)}
              twClassName="flex-1"
            >
              50%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleMaxPress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.max_button')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleDonePress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </Box>

          <Box twClassName="px-4">
            <Keypad
              value={closeAmountUSDString}
              onChange={handleKeypadChange}
              currency={'USD'}
              decimals={2}
            />
          </Box>
        </Box>
      )}

      {/* Summary + Action Buttons - Always visible (button hidden when keypad active) */}
      <Box twClassName="w-full pb-4" style={styles.footerWithSummary}>
        {/* Summary Section (not shown here if input focused, as it's rendered above keypad) */}
        {!isInputFocused && Summary}
        {!isInputFocused && (
          <BottomSheetFooter primaryButtonProps={confirmButtonProps} />
        )}
      </Box>

      {/* Limit Price Bottom Sheet - gated on the derived order type so a
          mid-session flag flip closes it immediately (effectiveOrderType can
          only be 'limit' while the feature flag is enabled). */}
      <PerpsLimitPriceBottomSheet
        isVisible={isLimitPriceVisible && effectiveOrderType === 'limit'}
        onClose={() => {
          setIsLimitPriceVisible(false);
          // If user dismisses without entering a price, revert order type to market
          if (orderType === 'limit' && !limitPrice) {
            selectOrderType('market');
            showToast(
              PerpsToastOptions.positionManagement.closePosition.limitClose
                .partial.switchToMarketOrderMissingLimitPrice,
            );
          }
        }}
        onConfirm={(price) => {
          setLimitPrice(price);
          // Close after confirmation explicitly
          setIsLimitPriceVisible(false);
        }}
        asset={position.symbol}
        limitPrice={limitPrice}
        currentPrice={currentPrice}
        direction={isLong ? 'short' : 'long'} // Opposite direction for closing
        isClosingPosition
      />

      <PerpsSlippageBottomSheet
        isVisible={isSlippageVisible && effectiveOrderType === 'market'}
        currentValueBps={maxSlippageBps}
        onClose={() => setIsSlippageVisible(false)}
        onSave={setMaxSlippage}
      />

      {/* Order Type Bottom Sheet - gated behind feature flag */}
      {isClosePositionLimitOrderEnabled && (
        <PerpsOrderTypeBottomSheet
          isVisible={isOrderTypeVisible}
          onClose={() => setIsOrderTypeVisible(false)}
          onSelect={(type) => {
            if (isStrategyOrderType(type)) {
              return;
            }
            selectOrderType(type);
            setIsOrderTypeVisible(false);
          }}
          currentOrderType={orderType}
          asset={position.symbol}
          direction={isLong ? 'short' : 'long'} // Opposite direction for closing
        />
      )}
    </SafeAreaView>
  );
};
export default PerpsClosePositionView;
