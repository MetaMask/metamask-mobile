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

  // For unpriced tokens we have no fiat rate, so the "X available" line should
  // show the raw token balance rather than "$0.00".
  const availableBalance =
    isUnpricedSource && sourceToken?.balance
      ? `${sourceToken.balance} ${sourceToken.symbol ?? ''}`
      : sourceBalanceFiat;

  return (
    <QuickBuyAmountSection
      amountDisplayMode={amountDisplayMode}
      fiatCryptoToggleEnabled={features.fiatCryptoToggle}
      usdAmount={usdAmount}
      destSymbol={cryptoSymbol}
      estimatedReceiveAmount={estimatedReceiveAmount}
      availableBalanceFiat={availableBalance}
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
