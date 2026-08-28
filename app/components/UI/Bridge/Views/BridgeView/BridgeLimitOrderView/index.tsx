import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, type LayoutChangeEvent } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  selectBridgeBalanceRefreshKey,
  selectSourceToken,
} from '../../../../../../core/redux/slices/bridge';
import { BridgeQuoteDataProvider } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import OrdersTabs from '../../../components/OrdersTabs';
import {
  HardwareWalletUnsupportedBanner,
  InsufficientNativeReserveBanner,
  MissingQuoteAndAssetsPriceDataBanner,
  QuoteErrorBanner,
  StellarTrustlineBanner,
  SwapsBanners,
  TokenWarningBanner,
} from '../../../components/SwapsBanners';
import { SwapsInputs } from '../../../components/SwapsInputs';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { useLimitOrderSwapInputs } from '../../../hooks/useLimitOrderSwapsInput';
import { LIMIT_MOCK_HISTORY_TAB } from './BridgeLimitOrderView.mockHistory';
import { LIMIT_MOCK_OPEN_ORDERS_TAB } from './BridgeLimitOrderView.mockOpenOrders';
import { BridgeLimitOrderFooterView } from './BridgeLimitOrderFooterView';
import { SwapsLimitOrderConfirmButton } from '../../../components/SwapsLimitOrderConfirmButton';
import { LimitOrderPriceAdjustCard } from '../../../components/LimitOrderPriceAdjustCard';
import type {
  ButtonPricePresetsSectionRef,
  InputSectionRef,
} from '../../../components/LimitOrderPriceAdjustCard/types';
import { LIMIT_ORDER_BUTTON_PRICE_PRESETS } from '../../../constants/limitOrders';
import { useSwapsLimitOrderPriceAdjust } from '../../../hooks/useSwapsLimitOrderPriceAdjust';
import { useSwapsLimitOrderKeypad } from '../../../hooks/useSwapsLimitOrderKeypad';

interface BridgeLimitOrderViewContentProps {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

const BridgeLimitOrderViewContent = ({
  latestSourceBalance,
}: BridgeLimitOrderViewContentProps) => {
  const tw = useTailwind();
  const inputRef = useRef<TokenInputAreaRef>(null);
  const limitPriceInputRef = useRef<InputSectionRef>(null);
  const customPercentInputRef = useRef<ButtonPricePresetsSectionRef>(null);
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
  } = useLimitOrderSwapInputs({ latestSourceBalance });
  const {
    commitCustomPercent,
    counterToken,
    customValue,
    handleCustomPress,
    handleCustomValueChange,
    handleLimitPriceChange,
    handleMarketPress,
    handlePercentPress,
    isCustomActive,
    isLimitFiatMode,
    executionType,
    limitPrice,
    marketComparison,
    onAmountTypeTogglePress,
    onQuoteUnitPress,
    quotedSymbol,
    secondaryValue,
    value,
  } = useSwapsLimitOrderPriceAdjust({
    destToken,
    destTokenAmount,
    sourceToken,
  });
  const {
    close: closeKeypad,
    customPercentSelection,
    focusAmount,
    focusCustomPercent,
    focusLimitPrice,
    handleChange: handleKeypadChange,
    handleCustomPercentSelectionChange,
    handleLimitPriceSelectionChange,
    isAmountFocused,
    isCustomPercentFocused,
    keypadProps,
    keypadRef,
    limitPriceSelection,
  } = useSwapsLimitOrderKeypad({
    customPercent: customValue,
    isLimitFiatMode,
    limitPrice,
    nativeToken: counterToken,
    onCustomPercentChange: handleCustomValueChange,
    onLimitPriceChange: handleLimitPriceChange,
    sourceAmountInput,
  });

  const [hasVisibleBanner, setHasVisibleBanner] = useState(false);

  const blurLimitAdjustInputs = useCallback(() => {
    limitPriceInputRef.current?.blur();
    customPercentInputRef.current?.blur();
  }, []);

  const commitCustomPercentIfFocused = useCallback(() => {
    if (isCustomPercentFocused) {
      commitCustomPercent();
    }
  }, [commitCustomPercent, isCustomPercentFocused]);

  const dismissInputAndKeypad = useCallback(() => {
    commitCustomPercentIfFocused();
    inputRef.current?.blur();
    blurLimitAdjustInputs();
    closeKeypad();
  }, [blurLimitAdjustInputs, closeKeypad, commitCustomPercentIfFocused]);

  const onSourceInputPress = useCallback(() => {
    commitCustomPercentIfFocused();
    focusAmount();
  }, [commitCustomPercentIfFocused, focusAmount]);

  const onLimitPriceInputPress = useCallback(() => {
    commitCustomPercentIfFocused();
    focusLimitPrice();
  }, [commitCustomPercentIfFocused, focusLimitPrice]);

  const closeKeypadWithoutCommit = useCallback(() => {
    inputRef.current?.blur();
    blurLimitAdjustInputs();
    closeKeypad();
  }, [blurLimitAdjustInputs, closeKeypad]);

  const onMarketPresetPress = useCallback(() => {
    handleMarketPress();
    closeKeypadWithoutCommit();
  }, [closeKeypadWithoutCommit, handleMarketPress]);

  const onPercentPresetPress = useCallback(
    (percent: number) => {
      handlePercentPress(percent);
      closeKeypadWithoutCommit();
    },
    [closeKeypadWithoutCommit, handlePercentPress],
  );

  const onCustomPresetPress = useCallback(() => {
    handleCustomPress();
    focusCustomPercent();
  }, [focusCustomPercent, handleCustomPress]);

  const handleBannersLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHasVisibleBanner = event.nativeEvent.layout.height > 0;
    setHasVisibleBanner((current) =>
      current === nextHasVisibleBanner ? current : nextHasVisibleBanner,
    );
  }, []);

  return (
    <Box twClassName="flex-1 bg-default">
      <Box
        twClassName="flex-1 min-h-0"
        testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
      >
        <ScrollView
          testID={BridgeViewSelectorsIDs.LIMIT_ORDER_SCROLL}
          style={tw.style('flex-1 min-h-0')}
          contentContainerStyle={tw.style('grow')}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={dismissInputAndKeypad}
        >
          <Box
            twClassName="flex-1"
            testID={BridgeViewSelectorsIDs.LIMIT_ORDER_DISMISS_AREA}
            onStartShouldSetResponder={() => true}
            onResponderRelease={dismissInputAndKeypad}
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
              onSourceInputPress={onSourceInputPress}
              onSourceTokenPress={handleSourceTokenPress}
              onSourceMaxPress={handleSourceMaxPress}
              onFlipPress={handleFlipTokensPress}
              onDestInputPress={closeKeypad}
              onDestTokenPress={handleDestTokenPress}
              sourceTokenAreaTestID={
                BridgeViewSelectorsIDs.LIMIT_SOURCE_TOKEN_AREA
              }
              destTokenAreaTestID={BridgeViewSelectorsIDs.LIMIT_DEST_TOKEN_AREA}
              sourceAmountTypeToggleTestID={
                BridgeViewSelectorsIDs.LIMIT_SOURCE_AMOUNT_TYPE_TOGGLE
              }
            />

            <LimitOrderPriceAdjustCard
              hasVisibleBanner={hasVisibleBanner}
              onDismissKeypad={dismissInputAndKeypad}
              orderSide={executionType}
              quoteTokenSymbol={quotedSymbol}
              isLimitFiatMode={isLimitFiatMode}
              onQuoteUnitPress={onQuoteUnitPress}
              limitPrice={value}
              onLimitPriceInputPress={onLimitPriceInputPress}
              limitPriceSelection={limitPriceSelection}
              onLimitPriceSelectionChange={handleLimitPriceSelectionChange}
              secondaryLimitPrice={secondaryValue}
              onAmountTypeTogglePress={onAmountTypeTogglePress}
              marketComparison={marketComparison}
              pricePresets={LIMIT_ORDER_BUTTON_PRICE_PRESETS}
              isCustomPercentActive={isCustomActive}
              customPercent={customValue}
              customPercentSelection={customPercentSelection}
              onMarketPresetPress={onMarketPresetPress}
              onPercentPresetPress={onPercentPresetPress}
              onCustomPresetPress={onCustomPresetPress}
              onCustomPercentInputPress={focusCustomPercent}
              onCustomPercentSelectionChange={
                handleCustomPercentSelectionChange
              }
              limitPriceInputRef={limitPriceInputRef}
              customPercentInputRef={customPercentInputRef}
            />

            <Box
              twClassName="flex-grow-0 pb-3"
              onTouchEnd={dismissInputAndKeypad}
            >
              <Box onLayout={handleBannersLayout}>
                <SwapsBanners
                  latestSourceAtomicBalance={latestSourceBalance?.atomicBalance}
                  onAdjustSourceAmount={handleSourcePresetAmountSelect}
                >
                  <HardwareWalletUnsupportedBanner />
                  <QuoteErrorBanner />
                  <TokenWarningBanner />
                  <StellarTrustlineBanner />
                  <InsufficientNativeReserveBanner />
                  <MissingQuoteAndAssetsPriceDataBanner />
                </SwapsBanners>
              </Box>
            </Box>

            <Box onTouchEnd={dismissInputAndKeypad}>
              <OrdersTabs
                enabledChainIds={enabledChainIds}
                openOrders={LIMIT_MOCK_OPEN_ORDERS_TAB}
                history={LIMIT_MOCK_HISTORY_TAB}
              />
            </Box>
          </Box>
        </ScrollView>

        <BridgeLimitOrderFooterView />

        <SwapsKeypad
          ref={keypadRef}
          onChange={handleKeypadChange}
          {...keypadProps}
        >
          {isAmountFocused && sourceAmount && sourceAmount !== '0' ? (
            <SwapsLimitOrderConfirmButton
              onPress={() => 'test'}
              label="test"
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
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

const BridgeLimitOrderView = () => {
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
      <BridgeLimitOrderViewContent latestSourceBalance={latestSourceBalance} />
    </BridgeQuoteDataProvider>
  );
};

export default BridgeLimitOrderView;
