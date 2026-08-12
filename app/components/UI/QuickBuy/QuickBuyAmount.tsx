import React, { useCallback } from 'react';
import QuickBuyAmountSection from './components/QuickBuyAmountSection';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Amount section primitive — primary amount, balance, hidden input.
 */
const QuickBuyAmount: React.FC = () => {
  const {
    amountDisplayMode,
    fiatAmountLabel,
    fiatAmount,
    currentCurrency,
    target,
    tradeMode,
    hasSourcePrice,
    sourceAmountTokens,
    sourceTokenAmount,
    sourceToken,
    estimatedReceiveAmount,
    destToken,
    isBlockingQuoteLoad,
    hiddenInputRef,
    handleAmountAreaPress,
    handleAmountChange,
    setIsKeypadOpen,
    isKeypadOpen,
    hasNoPayWithFunds,
  } = useQuickBuyContext();

  // Tapping the headline (re)opens the keypad and aligns the display mode.
  const handleHeadlinePress = useCallback(() => {
    setIsKeypadOpen(true);
    handleAmountAreaPress();
  }, [setIsKeypadOpen, handleAmountAreaPress]);

  const isUnpricedSource = tradeMode === 'sell' && !hasSourcePrice;

  // In sell mode (priced), the secondary label should show how much of the
  // source token the user is selling, not how much destination they'll receive.
  // In buy mode (or unpriced sell) keep the existing dest-token display.
  const isSellPriced = tradeMode === 'sell' && hasSourcePrice;
  const cryptoSymbol = isSellPriced
    ? (sourceToken?.symbol ?? target.tokenSymbol)
    : (destToken?.symbol ?? target.tokenSymbol);
  const displayedCryptoAmount = isSellPriced
    ? sourceTokenAmount
    : estimatedReceiveAmount;

  return (
    <QuickBuyAmountSection
      amountDisplayMode={amountDisplayMode}
      fiatAmountLabel={fiatAmountLabel}
      fiatAmount={fiatAmount}
      currency={currentCurrency}
      destSymbol={cryptoSymbol}
      estimatedReceiveAmount={displayedCryptoAmount}
      isQuoteLoading={isBlockingQuoteLoad}
      isUnpricedSource={isUnpricedSource}
      sourceCryptoAmount={sourceAmountTokens}
      sourceSymbol={sourceToken?.symbol ?? target.tokenSymbol}
      showCursor={isKeypadOpen}
      hiddenInputRef={hiddenInputRef}
      // Omitting the handler drops the surrounding pressable entirely, so with
      // no funds the headline can neither reopen the keypad nor focus the
      // hidden input — there is no amount to type against (TSA-984).
      onAmountAreaPress={hasNoPayWithFunds ? undefined : handleHeadlinePress}
      onAmountChange={handleAmountChange}
    />
  );
};

export default QuickBuyAmount;
