import React from 'react';
import QuickBuyAmountSection from './components/QuickBuyAmountSection';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Amount section primitive — primary amount, balance, hidden input.
 */
const QuickBuyAmount: React.FC = () => {
  const {
    amountDisplayMode,
    tradeMode,
    features,
    usdAmount,
    target,
    estimatedReceiveAmount,
    destToken,
    sourceBalanceFiat,
    isQuoteLoading,
    hiddenInputRef,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
  } = useQuickBuyContext();

  // estimatedReceiveAmount is always the dest-token amount from the quote,
  // so the symbol is always destToken's — position token in Buy, stable in Sell.
  const cryptoSymbol = destToken?.symbol ?? target.tokenSymbol;

  return (
    <QuickBuyAmountSection
      amountDisplayMode={amountDisplayMode}
      tradeMode={tradeMode}
      fiatCryptoToggleEnabled={features.fiatCryptoToggle}
      usdAmount={usdAmount}
      destSymbol={cryptoSymbol}
      estimatedCryptoAmount={estimatedReceiveAmount}
      availableBalanceFiat={sourceBalanceFiat}
      isQuoteLoading={isQuoteLoading}
      hiddenInputRef={hiddenInputRef}
      onAmountAreaPress={handleAmountAreaPress}
      onAmountChange={handleAmountChange}
      onToggleAmountDisplay={handleToggleAmountDisplay}
    />
  );
};

export default QuickBuyAmount;
