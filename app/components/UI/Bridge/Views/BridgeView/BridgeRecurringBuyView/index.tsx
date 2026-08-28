import React, { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  selectBridgeBalanceRefreshKey,
  selectRecurringEveryUnit,
  selectRecurringPriceRange,
  selectRecurringScheduleValidation,
  selectSourceToken,
  setRecurringEveryUnit,
  setRecurringPriceRange,
} from '../../../../../../core/redux/slices/bridge';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import OrdersTabs from '../../../components/OrdersTabs';
import PriceRangeRow from '../../../components/PriceRangeRow';
import PriceRangeSheet from '../../../components/PriceRangeSheet';
import RecurringConfirmOrderSheet from '../../../components/RecurringConfirmOrderSheet';
import RecurringIntervalSheet from '../../../components/RecurringIntervalSheet';
import RecurringRepeatInfoSheet from '../../../components/RecurringRepeatInfoSheet';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
import {
  HardwareWalletUnsupportedBanner,
  InsufficientNativeReserveBanner,
  MissingQuoteAndAssetsPriceDataBanner,
  QuoteErrorBanner,
  SwapsBanners,
  TokenWarningBanner,
} from '../../../components/SwapsBanners';
import { SwapsInputs } from '../../../components/SwapsInputs';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import { SwapsRecurringBuyConfirmButton } from '../../../components/SwapsRecurringBuyConfirmButton';
import { BridgeQuoteDataProvider, useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import { useTokenFiatRate } from '../../../hooks/useTokenFiatRate';
import { formatCurrency } from '../../../utils/currencyUtils';
import {
  isPriceRangeInCurrentCurrency,
  type RecurringPriceRange,
} from '../../../utils/priceRange';
import type { RecurringIntervalUnit } from '../../../utils/recurringSchedule';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { useRecurringBuyKeypad } from './useRecurringBuyKeypad';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';
import { RECURRING_MOCK_HISTORY_TAB } from './BridgeRecurringBuyView.mockHistory';
import { RECURRING_MOCK_OPEN_ORDERS_TAB } from './BridgeRecurringBuyView.mockOpenOrders';
import { BridgeRecurringBuyFooterView } from './BridgeRecurringBuyFooterView';

interface BridgeRecurringBuyViewContentProps {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

const BridgeRecurringBuyViewContent = ({
  latestSourceBalance,
}: BridgeRecurringBuyViewContentProps) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const inputRef = useRef<TokenInputAreaRef>(null);
  const [isPriceRangeSheetVisible, setIsPriceRangeSheetVisible] =
    useState(false);
  const [isIntervalSheetVisible, setIsIntervalSheetVisible] = useState(false);
  const [isRepeatInfoSheetVisible, setIsRepeatInfoSheetVisible] =
    useState(false);
  const [isConfirmSheetVisible, setIsConfirmSheetVisible] = useState(false);

  const {
    destToken,
    destTokenAmount,
    enabledChainIds,
    handleDestTokenPress,
    handleFlipTokensPress,
    handleSourceMaxPress,
    handleSourcePresetAmountSelect,
    handleSourceTokenPress,
    isDestAmountLoading,
    isFlipDisabled,
    isQuoteSponsored,
    sourceAmountInput,
    sourceToken,
    sourceAmount,
  } = useRecurringBuySwapInputs({ latestSourceBalance });

  const priceRange = useSelector(selectRecurringPriceRange);
  const everyUnit = useSelector(selectRecurringEveryUnit);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const scheduleValidation = useSelector(selectRecurringScheduleValidation);
  const { activeQuote } = useBridgeQuoteDataContext();
  const sourceFiatRate = useTokenFiatRate(sourceToken);
  const destFiatRate = useTokenFiatRate(destToken);

  const {
    close: closeKeypad,
    focusAmount,
    focusEvery,
    focusRepeat,
    handleChange: handleKeypadChange,
    keypadProps,
    keypadRef,
  } = useRecurringBuyKeypad({ sourceAmountInput });

  const dismissInputAndKeypad = useCallback(() => {
    inputRef.current?.blur();
    closeKeypad();
  }, [closeKeypad]);

  const canPreviewOrder = Boolean(activeQuote) && scheduleValidation.isValid;

  const handlePreviewOrder = useCallback(() => {
    dismissInputAndKeypad();
    setIsConfirmSheetVisible(true);
  }, [dismissInputAndKeypad]);

  const handleConfirmSheetClosed = useCallback(() => {
    setIsConfirmSheetVisible(false);
  }, []);

  const effectiveRange = isPriceRangeInCurrentCurrency(
    priceRange,
    currentCurrency,
  )
    ? priceRange
    : undefined;
  const priceRangeToken =
    effectiveRange?.tokenSide === 'source' ? sourceToken : destToken;
  const priceRangeMinLabel = effectiveRange
    ? formatCurrency(effectiveRange.min, effectiveRange.currency)
    : undefined;
  const priceRangeMaxLabel = effectiveRange
    ? formatCurrency(effectiveRange.max, effectiveRange.currency)
    : undefined;

  const handlePriceRangePress = useCallback(() => {
    dismissInputAndKeypad();
    setIsPriceRangeSheetVisible(true);
  }, [dismissInputAndKeypad]);

  const handlePriceRangeSheetClosed = useCallback(() => {
    setIsPriceRangeSheetVisible(false);
  }, []);

  const handlePriceRangeConfirm = useCallback(
    (nextPriceRange?: RecurringPriceRange) => {
      dispatch(setRecurringPriceRange(nextPriceRange));
    },
    [dispatch],
  );

  const handleUnitPress = useCallback(() => {
    dismissInputAndKeypad();
    setIsIntervalSheetVisible(true);
  }, [dismissInputAndKeypad]);

  const handleIntervalSheetClosed = useCallback(() => {
    setIsIntervalSheetVisible(false);
  }, []);

  const handleIntervalConfirm = useCallback(
    (unit: RecurringIntervalUnit) => {
      dispatch(setRecurringEveryUnit(unit));
    },
    [dispatch],
  );

  const handleRepeatInfoPress = useCallback(() => {
    dismissInputAndKeypad();
    setIsRepeatInfoSheetVisible(true);
  }, [dismissInputAndKeypad]);

  const handleRepeatInfoSheetClosed = useCallback(() => {
    setIsRepeatInfoSheetVisible(false);
  }, []);

  return (
    <Box twClassName="flex-1 bg-default">
      <Box
        twClassName="flex-1 min-h-0"
        testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
      >
        <ScrollView
          testID={BridgeViewSelectorsIDs.RECURRING_BUY_SCROLL}
          style={tw.style('flex-1 min-h-0')}
          contentContainerStyle={tw.style('grow-0')}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={dismissInputAndKeypad}
        >
          <SwapsInputs
            inputRef={inputRef}
            enabledChainIds={enabledChainIds}
            sourceToken={sourceToken}
            sourceAmountInput={sourceAmountInput}
            latestSourceBalance={latestSourceBalance}
            destToken={destToken}
            destTokenAmount={destTokenAmount}
            isDestAmountLoading={isDestAmountLoading}
            isFlipDisabled={isFlipDisabled}
            onSourceInputPress={focusAmount}
            onSourceTokenPress={handleSourceTokenPress}
            onSourceMaxPress={handleSourceMaxPress}
            onFlipPress={handleFlipTokensPress}
            onDestInputPress={closeKeypad}
            onDestTokenPress={handleDestTokenPress}
            sourceTokenAreaTestID={
              BridgeViewSelectorsIDs.RECURRING_SOURCE_TOKEN_AREA
            }
            destTokenAreaTestID={
              BridgeViewSelectorsIDs.RECURRING_DEST_TOKEN_AREA
            }
            sourceAmountTypeToggleTestID={
              BridgeViewSelectorsIDs.RECURRING_SOURCE_AMOUNT_TYPE_TOGGLE
            }
            hideDestAmount
            destAmountReplacementLabelTestID={
              BridgeViewSelectorsIDs.RECURRING_DEST_YOU_GET
            }
          />

          <Box onTouchEnd={dismissInputAndKeypad}>
            <SwapsBanners
              latestSourceAtomicBalance={latestSourceBalance?.atomicBalance}
              onAdjustSourceAmount={handleSourcePresetAmountSelect}
            >
              <HardwareWalletUnsupportedBanner />
              <QuoteErrorBanner />
              <TokenWarningBanner />
              <InsufficientNativeReserveBanner />
              <MissingQuoteAndAssetsPriceDataBanner />
            </SwapsBanners>
          </Box>

          <RecurringScheduleFields
            onEveryPress={focusEvery}
            onRepeatPress={focusRepeat}
            onDismissKeypad={dismissInputAndKeypad}
            onUnitPress={handleUnitPress}
            onRepeatInfoPress={handleRepeatInfoPress}
          />

          <PriceRangeRow
            token={effectiveRange ? priceRangeToken : undefined}
            minLabel={priceRangeMinLabel}
            maxLabel={priceRangeMaxLabel}
            onPress={handlePriceRangePress}
          />

          <Box onTouchEnd={dismissInputAndKeypad}>
            <OrdersTabs
              enabledChainIds={enabledChainIds}
              openOrders={RECURRING_MOCK_OPEN_ORDERS_TAB}
              history={RECURRING_MOCK_HISTORY_TAB}
            />
          </Box>
        </ScrollView>

        <BridgeRecurringBuyFooterView
          onPreviewOrder={handlePreviewOrder}
          isPreviewDisabled={!scheduleValidation.isValid}
        />

        <SwapsKeypad
          ref={keypadRef}
          onChange={handleKeypadChange}
          {...keypadProps}
        >
          {sourceAmount && sourceAmount !== '0' ? (
            <SwapsRecurringBuyConfirmButton
              onPress={handlePreviewOrder}
              label={strings('bridge.recurring.preview_order')}
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
              disabled={!canPreviewOrder}
            />
          ) : (
            <GaslessQuickPickOptions
              token={sourceToken}
              tokenBalance={latestSourceBalance?.displayBalance}
              onMaxPress={handleSourceMaxPress}
              isQuoteSponsored={isQuoteSponsored}
              onAmountSelect={handleSourcePresetAmountSelect}
            />
          )}
        </SwapsKeypad>

        <PriceRangeSheet
          isVisible={isPriceRangeSheetVisible}
          sourceToken={sourceToken}
          destToken={destToken}
          sourceFiatRate={sourceFiatRate}
          destFiatRate={destFiatRate}
          currentCurrency={currentCurrency}
          initialTokenSide={effectiveRange?.tokenSide}
          initialMin={effectiveRange?.min}
          initialMax={effectiveRange?.max}
          onClose={handlePriceRangeSheetClosed}
          onConfirm={handlePriceRangeConfirm}
        />

        <RecurringIntervalSheet
          isVisible={isIntervalSheetVisible}
          currentUnit={everyUnit}
          onClose={handleIntervalSheetClosed}
          onConfirm={handleIntervalConfirm}
        />

        <RecurringRepeatInfoSheet
          isVisible={isRepeatInfoSheetVisible}
          onClose={handleRepeatInfoSheetClosed}
        />

        <RecurringConfirmOrderSheet
          isVisible={isConfirmSheetVisible}
          onClose={handleConfirmSheetClosed}
        />
      </Box>
    </Box>
  );
};

const BridgeRecurringBuyView = () => {
  const sourceToken = useSelector(selectSourceToken);
  const balanceRefreshKey = useSelector(selectBridgeBalanceRefreshKey);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
    refreshKey: balanceRefreshKey,
  });

  return (
    <BridgeQuoteDataProvider
      latestSourceAtomicBalance={latestSourceBalance?.atomicBalance}
    >
      <BridgeRecurringBuyViewContent
        latestSourceBalance={latestSourceBalance}
      />
    </BridgeQuoteDataProvider>
  );
};

export default BridgeRecurringBuyView;
