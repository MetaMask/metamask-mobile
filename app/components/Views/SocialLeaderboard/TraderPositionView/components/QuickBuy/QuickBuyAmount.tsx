import React from 'react';
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
  } = useQuickBuyContext();

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
      onAmountAreaPress={handleAmountAreaPress}
      onAmountChange={handleAmountChange}
    />
  );
};

export default QuickBuyAmount;
