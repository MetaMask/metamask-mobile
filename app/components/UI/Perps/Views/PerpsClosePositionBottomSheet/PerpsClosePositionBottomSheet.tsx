import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetFooter,
  type BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  SectionDivider,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { type OrdinaryOrderType } from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Keypad from '../../../../Base/Keypad';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsSlider from '../../components/PerpsSlider';
import PerpsValidationErrors from '../../components/PerpsValidationErrors';
import { usePerpsClosePositionForm } from '../../hooks/usePerpsClosePositionForm';
import { usePerpsLimitPriceInput } from '../../hooks/usePerpsLimitPriceInput';
import { formatPositionSize } from '../../utils/formatUtils';
import PerpsCloseTotals from './components/PerpsCloseTotals';
import PerpsClosePositionSheetHeader from './components/PerpsClosePositionSheetHeader';
import PerpsLimitPriceRow from './components/PerpsLimitPriceRow';
import PerpsSlippageBottomSheet from '../../components/PerpsSlippageBottomSheet';

/** One top-of-book button here, unlike the modal's separate bid and ask. */
const LIMIT_PRESET_TEST_IDS = {
  mid: PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_MID,
  bid: PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_TOP_OF_BOOK,
  ask: PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_TOP_OF_BOOK,
  percentPrefix: PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_PERCENT,
};

const PerpsClosePositionBottomSheet: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [isSlippageVisible, setIsSlippageVisible] = useState(false);

  const dismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const {
    position,
    livePosition,
    isLong,
    currentPrice,
    szDecimals,
    isClosePositionLimitOrderEnabled,
    effectiveOrderType,
    selectOrderType,
    limitPrice,
    setLimitPrice,
    displayClosePercentage,
    liveCloseAmount,
    displayUSDString,
    handleSliderValueChange,
    handleSliderDragEnd,
    handleSliderDragCancel,
    handleDonePress,
    confirmButtonProps,
    feeResults,
    summaryMargin,
    summaryPnl,
    receiveAmount,
    filteredErrors,
    isClosing,
    shouldOpenSlippage,
    maxSlippageBps,
    setMaxSlippage,
  } = usePerpsClosePositionForm({
    dismiss,
    confirmButtonTestID:
      PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON,
  });

  React.useEffect(() => {
    if (shouldOpenSlippage) {
      setIsSlippageVisible(true);
    }
  }, [shouldOpenSlippage]);

  // The sheet has two modes: reviewing the close (slider, totals, CTA) and
  // editing the limit price (limit row, presets, keypad). The keypad covers
  // the CTA in Figma, so everything below the amount swaps on this one flag.
  const [isLimitPriceKeypadOpen, setIsLimitPriceKeypadOpen] = useState(
    effectiveOrderType === 'limit',
  );
  const isEditingLimitPrice =
    isLimitPriceKeypadOpen && effectiveOrderType === 'limit';
  const [showTokenAmount, setShowTokenAmount] = useState(false);

  const handleDisplayToggle = useCallback(
    () => setShowTokenAmount((current) => !current),
    [],
  );

  const limitPriceInput = usePerpsLimitPriceInput({
    asset: position.symbol,
    currentPrice,
    // Closing a long is a sell, so the presets mirror the opposite direction.
    direction: isLong ? 'short' : 'long',
    limitPrice,
    setLimitPrice,
    isClosingPosition: true,
    testIDs: LIMIT_PRESET_TEST_IDS,
  });

  const handleLimitPriceDone = useCallback(() => {
    limitPriceInput.trackInputMethod();
    setIsLimitPriceKeypadOpen(false);
  }, [limitPriceInput]);

  const handleOrderTypeChange = useCallback(
    (value: string) => {
      const nextOrderType = value as OrdinaryOrderType;
      if (nextOrderType === 'market') {
        limitPriceInput.trackInputMethod();
      }
      selectOrderType(nextOrderType);
      handleDonePress();
      // Each toggle returns that variant's default: market is idle with
      // the slider, limit is the limit-price keypad.
      setIsLimitPriceKeypadOpen(nextOrderType === 'limit');
    },
    [handleDonePress, limitPriceInput, selectOrderType],
  );

  const handleCloseSizePress = useCallback(() => {
    setIsLimitPriceKeypadOpen(false);
  }, []);

  const handleLimitPriceRowPress = useCallback(() => {
    handleDonePress();
    setIsLimitPriceKeypadOpen(true);
  }, [handleDonePress]);

  // Two order types, so the header control swaps between them on tap rather
  // than opening a picker.
  const handleOrderTypeToggle = useCallback(() => {
    handleOrderTypeChange(effectiveOrderType === 'market' ? 'limit' : 'market');
  }, [effectiveOrderType, handleOrderTypeChange]);

  const handleMarginTooltipPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.CLOSE_POSITION_MODALS, {
      screen: Routes.PERPS.MODALS.TOOLTIP,
      params: { contentKey: 'margin' },
    });
  }, [navigation]);

  const totalFeeRate =
    (feeResults.protocolFeeRate ?? 0) + (feeResults.metamaskFeeRate ?? 0);
  const feePercentage =
    totalFeeRate > 0 ? (totalFeeRate * 100).toFixed(3) : undefined;

  const displayedErrors = useMemo(
    () =>
      limitPriceInput.error
        ? filteredErrors.filter((error) => error !== limitPriceInput.error)
        : filteredErrors,
    [filteredErrors, limitPriceInput.error],
  );

  // `formatLimitPriceInput` already prefixes `$`, so the row keeps a
  // standalone `$` and shows only the numeric portion next to it.
  const hasLimitPriceValue = Boolean(limitPriceInput.formattedLimitPrice);

  const footerMessages = useMemo(() => {
    const needsLimitPrice =
      effectiveOrderType === 'limit' &&
      !hasLimitPriceValue &&
      !isEditingLimitPrice;

    return needsLimitPrice
      ? [
          ...displayedErrors,
          strings('perps.order.validation.please_set_a_limit_price'),
        ]
      : displayedErrors;
  }, [
    displayedErrors,
    effectiveOrderType,
    hasLimitPriceValue,
    isEditingLimitPrice,
  ]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={PerpsClosePositionBottomSheetSelectorsIDs.CONTAINER}
    >
      <PerpsClosePositionSheetHeader
        symbol={position.symbol}
        isLong={isLong}
        leverage={livePosition.leverage?.value}
        currentPrice={currentPrice}
        orderTypeLabel={
          effectiveOrderType === 'market'
            ? strings('perps.order.market')
            : strings('perps.order.limit')
        }
        isOrderTypeToggleVisible={isClosePositionLimitOrderEnabled}
        isOrderTypeToggleDisabled={isClosing}
        onOrderTypeToggle={handleOrderTypeToggle}
      />

      <PerpsAmountDisplay
        variant="tradeSheet"
        amount={displayUSDString}
        showWarning={false}
        onPress={handleCloseSizePress}
        accessibilityLabel={strings('perps.close_position.select_amount')}
        showTokenAmount={showTokenAmount}
        tokenAmount={formatPositionSize(liveCloseAmount, szDecimals)}
        hasError={displayedErrors.length > 0}
        tokenSymbol={position.symbol}
        onDisplayToggle={handleDisplayToggle}
        displayToggleAccessibilityLabel={strings(
          'perps.close_position.toggle_amount_display',
        )}
        displayToggleTestID={
          PerpsClosePositionBottomSheetSelectorsIDs.AMOUNT_DISPLAY_TOGGLE
        }
      />

      {!isEditingLimitPrice && (
        <Box twClassName="px-4 py-4" onTouchCancel={handleSliderDragCancel}>
          <PerpsSlider
            value={displayClosePercentage}
            onValueChange={handleSliderValueChange}
            onDragEnd={handleSliderDragEnd}
            disabled={isClosing}
          />
        </Box>
      )}

      {effectiveOrderType === 'limit' && (
        <PerpsLimitPriceRow
          value={limitPriceInput.formattedLimitPrice.replace(/^\$/, '')}
          hasValue={hasLimitPriceValue}
          error={limitPriceInput.error}
          isEditing={isEditingLimitPrice}
          onPress={handleLimitPriceRowPress}
        />
      )}

      {effectiveOrderType === 'market' && !isEditingLimitPrice && (
        <Box twClassName="px-4 pb-0">
          <Box twClassName="bg-background-section rounded-xl overflow-hidden">
            <TouchableOpacity
              testID={PerpsClosePositionBottomSheetSelectorsIDs.SLIPPAGE_ROW}
              onPress={() => setIsSlippageVisible(true)}
            >
              <KeyValueRow
                variant={KeyValueRowVariant.Input}
                keyLabel={strings('perps.slippage.slippage')}
                value={`${maxSlippageBps / 100}%`}
              />
            </TouchableOpacity>
          </Box>
        </Box>
      )}

      {!isEditingLimitPrice && (
        <PerpsCloseTotals
          margin={summaryMargin}
          marginMode={livePosition.leverage?.type}
          pnl={summaryPnl}
          receiveAmount={receiveAmount}
          onMarginTooltipPress={handleMarginTooltipPress}
        />
      )}

      {/* Figma puts the keypad over the CTA, so the whole footer hides with it.
          Blocking errors sit with the CTA they are blocking, left aligned
          directly above it, matching the trade sheet. Errors about the limit
          price itself stay on that row, where they are still visible while the
          keypad is open. */}
      {!isEditingLimitPrice && (
        <>
          <SectionDivider marginVertical={1} twClassName="mx-4" />

          {/* One BodySm line stays reserved so an error appearing while the
              user drags the slider does not resize the sheet under them. */}
          <PerpsValidationErrors
            errors={footerMessages}
            alignment="start"
            twClassName="min-h-[22px] justify-center px-4"
          />

          <BottomSheetFooter
            primaryButtonProps={confirmButtonProps}
            twClassName="pt-3"
          />

          {feePercentage ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="pt-2 text-center"
              testID={PerpsClosePositionBottomSheetSelectorsIDs.FEE_DISCLAIMER}
            >
              {strings('perps.trade_sheet.includes_fee', { feePercentage })}
            </Text>
          ) : null}
        </>
      )}

      {isEditingLimitPrice && (
        <>
          <Box twClassName="flex-row gap-2 px-4 pt-3 mb-3">
            {limitPriceInput.presets.map((preset) => (
              <Button
                key={preset.testID}
                testID={preset.testID}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName="flex-1"
                onPress={preset.onPress}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleLimitPriceDone}
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </Box>

          <Box twClassName="mb-4 px-4">
            <Keypad
              value={limitPrice}
              currency="USD_PERPS"
              onChange={limitPriceInput.handleKeypadChange}
              decimals={5}
            />
          </Box>
        </>
      )}

      <PerpsSlippageBottomSheet
        isVisible={isSlippageVisible && effectiveOrderType === 'market'}
        currentValueBps={maxSlippageBps}
        onClose={() => setIsSlippageVisible(false)}
        onSave={setMaxSlippage}
      />
    </BottomSheet>
  );
};

export default PerpsClosePositionBottomSheet;
