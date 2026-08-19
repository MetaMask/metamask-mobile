import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import ScreenView from '../../../../../Base/ScreenView';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  selectBridgeBalanceRefreshKey,
  selectSourceToken,
} from '../../../../../../core/redux/slices/bridge';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import OrdersTabs from '../../../components/OrdersTabs';
import RecurringScheduleFields from '../../../components/RecurringScheduleFields';
import {
  HardwareWalletUnsupportedBanner,
  InsufficientNativeReserveBanner,
  MissingPriceDataBanner,
  QuoteErrorBanner,
  SwapsBanners,
  TokenWarningBanner,
} from '../../../components/SwapsBanners';
import { SwapsInputs } from '../../../components/SwapsInputs';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import { BridgeQuoteDataProvider } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { createStyles } from '../orderViewShell.styles';
import { useRecurringBuyKeypad } from './useRecurringBuyKeypad';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';

interface BridgeRecurringBuyViewContentProps {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

const BridgeRecurringBuyViewContent = ({
  latestSourceBalance,
}: BridgeRecurringBuyViewContentProps) => {
  const { styles } = useStyles(createStyles);
  const inputRef = useRef<TokenInputAreaRef>(null);

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
  } = useRecurringBuySwapInputs({ latestSourceBalance });

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

  return (
    <ScreenView safeAreaEdges={[]} contentContainerStyle={styles.screen}>
      <Box
        style={styles.content}
        testID={BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER}
        onStartShouldSetResponder={() => true}
        onResponderRelease={dismissInputAndKeypad}
      >
        <ScrollView
          testID={BridgeViewSelectorsIDs.RECURRING_BUY_SCROLL}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
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
          />

          <SwapsBanners
            latestSourceAtomicBalance={latestSourceBalance?.atomicBalance}
            onAdjustSourceAmount={handleSourcePresetAmountSelect}
          >
            <HardwareWalletUnsupportedBanner />
            <QuoteErrorBanner />
            <TokenWarningBanner />
            <InsufficientNativeReserveBanner />
            <MissingPriceDataBanner />
          </SwapsBanners>

          <RecurringScheduleFields
            onEveryPress={focusEvery}
            onRepeatPress={focusRepeat}
            onDismissKeypad={dismissInputAndKeypad}
          />

          <OrdersTabs openOrders={{ items: [] }} history={{ items: [] }} />
        </ScrollView>

        <SwapsKeypad
          ref={keypadRef}
          onChange={handleKeypadChange}
          {...keypadProps}
        >
          {isAmountFocused ? (
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
    </ScreenView>
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
