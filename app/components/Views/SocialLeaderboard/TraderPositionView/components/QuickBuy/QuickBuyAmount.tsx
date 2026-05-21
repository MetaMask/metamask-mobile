import React from 'react';
import QuickBuyAmountSection from './components/QuickBuyAmountSection';
import QuickBuyRateTag from './components/QuickBuyRateTag';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Amount section primitive — primary amount, rate tag, balance, hidden input.
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
    hasValidAmount,
    hiddenInputRef,
    formattedExchangeRate,
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
      hasValidAmount={hasValidAmount}
      hiddenInputRef={hiddenInputRef}
      onAmountAreaPress={handleAmountAreaPress}
      onAmountChange={handleAmountChange}
      onToggleAmountDisplay={handleToggleAmountDisplay}
      rateTag={<QuickBuyRateTag label={formattedExchangeRate} />}
    />
  );
};

export default QuickBuyAmount;
