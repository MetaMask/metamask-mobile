import PerpsFeeCaption from '../../components/PerpsFeesDisplay/PerpsFeeCaption';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  TextVariant,
} from '@metamask/design-system-react-native';
import { type OrdinaryOrderType } from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { ImpactMoment, useHaptics } from '../../../../../util/haptics';
import Keypad from '../../../../Base/Keypad';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsSlider from '../../components/PerpsSlider';
import PerpsSwapIcon from '../../components/PerpsSwapIcon';
import PerpsValidationErrors from '../../components/PerpsValidationErrors';
import PerpsRebateBanner from '../../components/PerpsRebateBanner';
import { usePerpsClosePositionForm } from '../../hooks/usePerpsClosePositionForm';
import { usePerpsLimitPriceInput } from '../../hooks/usePerpsLimitPriceInput';
import { formatPositionSize } from '../../utils/formatUtils';
import {
  formatCombinedFeePercentage,
  formatOriginalCombinedFeePercentage,
} from '../../utils/feeDiscount';
import PerpsCloseTotals from './components/PerpsCloseTotals';
import PerpsClosePositionSheetHeader from './components/PerpsClosePositionSheetHeader';
import PerpsLimitPriceRow from './components/PerpsLimitPriceRow';

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
  const { fireImpact } = useHaptics();

  const dismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const [showTokenAmount, setShowTokenAmount] = useState(false);

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
    closeAmountUSDString,
    displayUSDString,
    amountKeypadValue,
    amountKeypadDecimals,
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
    summaryPnl,
    summaryRoePercentage,
    receiveAmount,
    filteredErrors,
    isClosing,
  } = usePerpsClosePositionForm({
    dismiss,
    confirmButtonTestID:
      PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON,
    amountInputUnit: showTokenAmount ? 'asset' : 'usd',
  });

  // The sheet has two modes: reviewing the close (slider, totals, CTA) and
  // editing the limit price (limit row, presets, keypad). The keypad covers
  // the CTA in Figma, so everything below the amount swaps on this one flag.
  const [isLimitPriceKeypadOpen, setIsLimitPriceKeypadOpen] = useState(
    effectiveOrderType === 'limit',
  );
  const isEditingLimitPrice =
    isLimitPriceKeypadOpen && effectiveOrderType === 'limit';

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
    fireImpact(ImpactMoment.SecondaryCTA);
    limitPriceInput.trackInputMethod();
    setIsLimitPriceKeypadOpen(false);
  }, [limitPriceInput, fireImpact]);

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
    if (isEditingLimitPrice) {
      // Dismiss the limit price keypad and return to slider mode.
      setIsLimitPriceKeypadOpen(false);
    } else {
      handleAmountPress();
    }
  }, [handleAmountPress, isEditingLimitPrice]);

  const handleLimitPriceRowPress = useCallback(() => {
    fireImpact(ImpactMoment.SecondaryCTA);
    handleDonePress();
    setIsLimitPriceKeypadOpen(true);
  }, [handleDonePress, fireImpact]);

  // Two order types, so the header control swaps between them on tap rather
  // than opening a picker.
  const handleOrderTypeToggle = useCallback(() => {
    fireImpact(ImpactMoment.TabChange);
    handleOrderTypeChange(effectiveOrderType === 'market' ? 'limit' : 'market');
  }, [effectiveOrderType, handleOrderTypeChange, fireImpact]);

  const feePercentage = formatCombinedFeePercentage(
    feeResults.protocolFeeRate,
    feeResults.metamaskFeeRate,
  );
  const originalFeePercentage = formatOriginalCombinedFeePercentage(
    feeResults.protocolFeeRate,
    feeResults.metamaskFeeRate,
    feeResults.originalMetamaskFeeRate,
  );

  // Limit price errors only apply to limit closes. The input hook validates the
  // stored price regardless of order type, so gate it here. Nothing is shown
  // while the keypad is open: the message appears once the user stops typing.
  // "Too far from market" is the blocking message above Close, and only when
  // the price is outside the deviation band. Direction warnings stay on the row.
  const limitPriceError =
    effectiveOrderType === 'limit' ? limitPriceInput.error : '';
  const limitPriceTooFarError = strings(
    'perps.order.limit_price_modal.limit_price_too_far',
  );
  const isLimitPriceBandError = limitPriceError.startsWith(
    limitPriceTooFarError,
  );
  const showLimitPriceErrorOnRow =
    Boolean(limitPriceError) && !isLimitPriceBandError && !isEditingLimitPrice;

  const displayedErrors = useMemo(() => {
    const withoutRowDuplicate = showLimitPriceErrorOnRow
      ? filteredErrors.filter((error) => error !== limitPriceError)
      : filteredErrors;

    if (
      !showLimitPriceErrorOnRow &&
      limitPriceError &&
      !withoutRowDuplicate.includes(limitPriceError)
    ) {
      return [...withoutRowDuplicate, limitPriceError];
    }

    return withoutRowDuplicate;
  }, [filteredErrors, limitPriceError, showLimitPriceErrorOnRow]);

  // `formatLimitPriceInput` already prefixes `$`, so the row keeps a
  // standalone `$` and shows only the numeric portion next to it.
  const hasLimitPriceValue = Boolean(limitPriceInput.formattedLimitPrice);
  const needsLimitPriceHint =
    effectiveOrderType === 'limit' &&
    !hasLimitPriceValue &&
    !isEditingLimitPrice;

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
        orderType={effectiveOrderType === 'market' ? 'market' : 'limit'}
        isOrderTypeToggleVisible={isClosePositionLimitOrderEnabled}
        isOrderTypeToggleDisabled={isClosing}
        onOrderTypeToggle={handleOrderTypeToggle}
      />

      <PerpsAmountDisplay
        variant="tradeSheet"
        amount={displayUSDString}
        showWarning={false}
        onPress={handleCloseSizePress}
        isActive={isInputFocused}
        accessibilityLabel={strings('perps.close_position.select_amount')}
        showTokenAmount={showTokenAmount}
        tokenAmount={
          showTokenAmount && isInputFocused
            ? amountKeypadValue
            : formatPositionSize(liveCloseAmount, szDecimals)
        }
        hasError={displayedErrors.length > 0}
        tokenSymbol={position.symbol}
        onDisplayToggle={handleDisplayToggle}
        displayToggleAccessibilityLabel={strings(
          'perps.close_position.toggle_amount_display',
        )}
        displayToggleTestID={
          PerpsClosePositionBottomSheetSelectorsIDs.AMOUNT_DISPLAY_TOGGLE
        }
        displayToggleIcon={<PerpsSwapIcon direction="vertical" />}
        twClassName="py-8"
      />

      {!isEditingLimitPrice && !isInputFocused && (
        <Box twClassName="px-4 pt-4" onTouchCancel={handleSliderDragCancel}>
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
          error={showLimitPriceErrorOnRow ? limitPriceError : ''}
          isEditing={isEditingLimitPrice}
          onPress={handleLimitPriceRowPress}
        />
      )}

      {!isEditingLimitPrice && !isInputFocused && (
        <PerpsCloseTotals
          pnl={summaryPnl}
          roePercentage={summaryRoePercentage}
          receiveAmount={receiveAmount}
        />
      )}

      {/* Figma puts the keypad over the CTA, so the whole footer hides with it.
          Blocking errors, including a limit price outside the band, sit with
          the CTA they are blocking, and only after the keypad closes.
          Direction warnings stay on the limit row once typing stops. */}
      {!isEditingLimitPrice && !isInputFocused && (
        <>
          <PerpsRebateBanner
            coin={position.symbol}
            direction={isLong ? 'short' : 'long'}
            notionalUsd={closeAmountUSDString}
            containerTwClassName="px-4 mb-3"
          />

          <SectionDivider twClassName="mx-4 mt-3 mb-3" />

          <PerpsValidationErrors
            errors={displayedErrors}
            twClassName="min-h-[22px] justify-center px-4"
          />

          {feePercentage && displayedErrors.length === 0 ? (
            <PerpsFeeCaption
              feePercentage={feePercentage}
              originalFeePercentage={originalFeePercentage}
              feeDiscountPercentage={feeResults.feeDiscountPercentage}
              feeDiscountKind={feeResults.feeDiscountKind}
              testID={PerpsClosePositionBottomSheetSelectorsIDs.FEE_DISCLAIMER}
              textVariant={TextVariant.BodySm}
            />
          ) : null}

          <BottomSheetFooter
            primaryButtonProps={{
              ...confirmButtonProps,
              ...(needsLimitPriceHint && {
                accessibilityHint: strings(
                  'perps.order.validation.please_set_a_limit_price',
                ),
              }),
            }}
            twClassName="pt-3"
          />
        </>
      )}

      {isInputFocused && (
        <>
          <Box twClassName="flex-row gap-2 px-4 pt-3 mb-3">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              twClassName="flex-1 rounded-xl"
              onPress={() => handlePercentagePress(0.25)}
            >
              25%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              twClassName="flex-1 rounded-xl"
              onPress={() => handlePercentagePress(0.5)}
            >
              50%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              twClassName="flex-1 rounded-xl"
              onPress={handleMaxPress}
            >
              {strings('perps.deposit.max_button')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              twClassName="rounded-xl"
              onPress={handleDonePress}
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </Box>

          <Box twClassName="mb-4 px-4">
            <Keypad
              value={showTokenAmount ? amountKeypadValue : closeAmountUSDString}
              onChange={handleKeypadChange}
              currency={showTokenAmount ? 'ASSET' : 'USD'}
              decimals={showTokenAmount ? amountKeypadDecimals : 2}
            />
          </Box>
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
                twClassName="flex-1 rounded-xl"
                onPress={preset.onPress}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              twClassName="rounded-xl"
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
    </BottomSheet>
  );
};

export default PerpsClosePositionBottomSheet;
