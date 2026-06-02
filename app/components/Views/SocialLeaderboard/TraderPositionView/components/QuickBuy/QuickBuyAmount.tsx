import React from 'react';
import QuickBuyAmountSection from './components/QuickBuyAmountSection';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Amount section primitive — primary amount, balance, hidden input.
 */
const QuickBuyAmount: React.FC = () => {
  const {
    amountDisplayMode,
    features,
    usdAmount,
    target,
    tradeMode,
    hasSourcePrice,
    sourceAmountTokens,
    sourceToken,
    estimatedReceiveAmount,
    destToken,
    sourceBalanceFiat,
    isQuoteLoading,
    hiddenInputRef,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
  } = useQuickBuyContext();

  const cryptoSymbol = destToken?.symbol ?? target.tokenSymbol;

  const isUnpricedSource = tradeMode === 'sell' && !hasSourcePrice;

  return (
    <QuickBuyAmountSection
      amountDisplayMode={amountDisplayMode}
      fiatCryptoToggleEnabled={features.fiatCryptoToggle}
      usdAmount={usdAmount}
      destSymbol={cryptoSymbol}
      estimatedCryptoAmount={estimatedReceiveAmount}
      availableBalanceFiat={sourceBalanceFiat}
      isQuoteLoading={isQuoteLoading}
      isUnpricedSource={isUnpricedSource}
      sourceCryptoAmount={sourceAmountTokens}
      sourceSymbol={sourceToken?.symbol ?? target.tokenSymbol}
      hiddenInputRef={hiddenInputRef}
      onAmountAreaPress={handleAmountAreaPress}
      onAmountChange={handleAmountChange}
      onToggleAmountDisplay={handleToggleAmountDisplay}
    />
  );
};

export default QuickBuyAmount;
