import React from 'react';
import QuickBuyAmountSection from './components/QuickBuyAmountSection';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Amount section primitive — primary amount, balance, hidden input.
 */
const QuickBuyAmount: React.FC = () => {
  const {
    amountDisplayMode,
    usdAmount,
    target,
    estimatedReceiveAmount,
    isQuoteLoading,
    hiddenInputRef,
    handleAmountAreaPress,
    handleAmountChange,
  } = useQuickBuyContext();

  return (
    <QuickBuyAmountSection
      amountDisplayMode={amountDisplayMode}
      usdAmount={usdAmount}
      destSymbol={target.tokenSymbol}
      estimatedReceiveAmount={estimatedReceiveAmount}
      isQuoteLoading={isQuoteLoading}
      hiddenInputRef={hiddenInputRef}
      onAmountAreaPress={handleAmountAreaPress}
      onAmountChange={handleAmountChange}
    />
  );
};

export default QuickBuyAmount;
