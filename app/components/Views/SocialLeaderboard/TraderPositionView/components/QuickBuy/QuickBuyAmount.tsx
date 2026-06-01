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
    sourceToken,
    sourceBalanceFiat,
    isQuoteLoading,
    hiddenInputRef,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
  } = useQuickBuyContext();

  const cryptoSymbol =
    tradeMode === 'sell'
      ? (sourceToken?.symbol ?? target.tokenSymbol)
      : target.tokenSymbol;

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
