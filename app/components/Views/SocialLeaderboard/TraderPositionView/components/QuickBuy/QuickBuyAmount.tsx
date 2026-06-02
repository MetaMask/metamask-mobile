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
    estimatedReceiveAmount,
    sourceBalanceFiat,
    isQuoteLoading,
    hiddenInputRef,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
  } = useQuickBuyContext();

  return (
    <QuickBuyAmountSection
      amountDisplayMode={amountDisplayMode}
      fiatCryptoToggleEnabled={features.fiatCryptoToggle}
      usdAmount={usdAmount}
      destSymbol={target.tokenSymbol}
      estimatedReceiveAmount={estimatedReceiveAmount}
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
