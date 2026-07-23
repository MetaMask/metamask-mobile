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
    useKeyboard,
    setIsKeypadOpen,
  } = useQuickBuyContext();

  // On the keyboard treatment, tapping the headline (re)opens the keypad and
  // aligns the display mode. Control leaves the headline non-interactive.
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
      destSymbol={cryptoSymbol}
      estimatedReceiveAmount={displayedCryptoAmount}
      isQuoteLoading={isBlockingQuoteLoad}
      isUnpricedSource={isUnpricedSource}
      sourceCryptoAmount={sourceAmountTokens}
      sourceSymbol={sourceToken?.symbol ?? target.tokenSymbol}
      hiddenInputRef={hiddenInputRef}
      onAmountAreaPress={useKeyboard ? handleHeadlinePress : undefined}
      onAmountChange={handleAmountChange}
    />
  );
};

export default QuickBuyAmount;
