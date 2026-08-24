import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  selectBridgeBalanceRefreshKey,
  selectSourceAmount,
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
  SwapsBanners,
  TokenWarningBanner,
} from '../../../components/SwapsBanners';
import { SwapsInputs } from '../../../components/SwapsInputs';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import type { SwapsKeypadRef } from '../../../components/SwapsKeypad/types';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { useLimitOrderSwapInputs } from './useLimitOrderSwapInputs';
import { LIMIT_MOCK_HISTORY_TAB } from './BridgeLimitOrderView.mockHistory';
import { LIMIT_MOCK_OPEN_ORDERS_TAB } from './BridgeLimitOrderView.mockOpenOrders';
import { BridgeLimitOrderFooterView } from './BridgeLimitOrderFooterView';
import { SwapsLimitOrderConfirmButton } from '../../../components/SwapsLimitOrderConfirmButton';

interface BridgeLimitOrderViewContentProps {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

const BridgeLimitOrderViewContent = ({
  latestSourceBalance,
}: BridgeLimitOrderViewContentProps) => {
  const tw = useTailwind();
  const inputRef = useRef<TokenInputAreaRef>(null);
  const keypadRef = useRef<SwapsKeypadRef>(null);
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

  const dismissInputAndKeypad = useCallback(() => {
    inputRef.current?.blur();
    keypadRef.current?.close();
  }, []);

  const openKeypad = useCallback(() => keypadRef.current?.open(), []);
  const closeKeypad = useCallback(() => keypadRef.current?.close(), []);

  return (
    <Box twClassName="flex-1 bg-default">
      <Box
        twClassName="flex-1 min-h-0"
        testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
      >
        <ScrollView
          testID={BridgeViewSelectorsIDs.LIMIT_ORDER_SCROLL}
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
            onSourceInputPress={openKeypad}
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

            <OrdersTabs
              enabledChainIds={enabledChainIds}
              openOrders={LIMIT_MOCK_OPEN_ORDERS_TAB}
              history={LIMIT_MOCK_HISTORY_TAB}
            />
          </Box>
        </ScrollView>

        <BridgeLimitOrderFooterView />

        <SwapsKeypad
          ref={keypadRef}
          value={sourceAmountInput.keypadValue}
          onChange={sourceAmountInput.handleKeypadChange}
          currency={sourceAmountInput.keypadCurrency}
          decimals={sourceAmountInput.keypadDecimals}
        >
          {sourceAmount && sourceAmount !== '0' ? (
            <SwapsLimitOrderConfirmButton
              onPress={() => 'test'}
              label="test"
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
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
