import React, { useCallback, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  selectRecurringPriceRange,
  selectRecurringScheduleValidation,
} from '../../../../../../core/redux/slices/bridge';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import OrdersTabs from '../../../components/OrdersTabs';
import PriceRangeRow from '../../../components/PriceRangeRow';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
import {
  HardwareWalletUnsupportedBanner,
  InsufficientNativeReserveBanner,
  MissingQuoteAndAssetsPriceDataBanner,
  QuoteErrorBanner,
  DestAssetRequireActivateBanner,
  SwapsBanners,
  TokenWarningBanner,
} from '../../../components/SwapsBanners';
import { SwapsInputs } from '../../../components/SwapsInputs';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import { SwapsRecurringBuyConfirmButton } from '../../../components/SwapsRecurringBuyConfirmButton';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import {
  formatPriceRangeBounds,
  isPriceRangeInCurrentCurrency,
} from '../../../utils/priceRange';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { useRecurringBuyKeypad } from './useRecurringBuyKeypad';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';
import { createRecurringMockHistoryTab } from './BridgeRecurringBuyView.mockHistory';
import { createRecurringMockOpenOrdersTab } from './BridgeRecurringBuyView.mockOpenOrders';
import { BridgeRecurringBuyFooterView } from './BridgeRecurringBuyFooterView';
import { useBridgeSession } from '../../../hooks/useBridgeSession';

const BridgeRecurringBuyViewContent = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const inputRef = useRef<TokenInputAreaRef>(null);

  const { latestSourceBalance } = useBridgeSession();
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
  const currentCurrency = useSelector(selectCurrentCurrency);
  const scheduleValidation = useSelector(selectRecurringScheduleValidation);
  const { activeQuote, isLoading } = useBridgeQuoteDataContext();

  const {
    close: closeKeypad,
    focusAmount,
    focusEvery,
    focusRepeat,
    handleChange: handleKeypadChange,
    isAmountFocused,
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
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_CONFIRM_ORDER_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

  const handleJobPress = useCallback(
    (jobId: string) => {
      navigation.navigate(Routes.BRIDGE.RECURRING_JOB_DETAILS, { jobId });
    },
    [navigation],
  );

  const openOrders = useMemo(
    () => createRecurringMockOpenOrdersTab(handleJobPress),
    [handleJobPress],
  );
  const history = useMemo(
    () => createRecurringMockHistoryTab(handleJobPress),
    [handleJobPress],
  );

  const effectiveRange = isPriceRangeInCurrentCurrency(
    priceRange,
    currentCurrency,
  )
    ? priceRange
    : undefined;
  const priceRangeToken =
    effectiveRange?.tokenSide === 'source' ? sourceToken : destToken;
  const { minLabel: priceRangeMinLabel, maxLabel: priceRangeMaxLabel } =
    formatPriceRangeBounds(
      effectiveRange?.min ?? '',
      effectiveRange?.max ?? '',
      effectiveRange?.currency ?? currentCurrency,
    );

  const handlePriceRangePress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_PRICE_RANGE_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

  const handleUnitPress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_INTERVAL_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

  const handleRepeatInfoPress = useCallback(() => {
    dismissInputAndKeypad();
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_REPEAT_INFO_MODAL,
    });
  }, [dismissInputAndKeypad, navigation]);

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
              <DestAssetRequireActivateBanner />
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
              openOrders={openOrders}
              history={history}
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
              loading={isLoading}
            />
          ) : isAmountFocused ? (
            <GaslessQuickPickOptions
              token={sourceToken}
              tokenBalance={latestSourceBalance?.displayBalance}
              onMaxPress={handleSourceMaxPress}
              isQuoteSponsored={isQuoteSponsored}
              onAmountSelect={handleSourcePresetAmountSelect}
            />
          ) : null}
        </SwapsKeypad>
      </Box>
    </Box>
  );
};

export default BridgeRecurringBuyViewContent;
