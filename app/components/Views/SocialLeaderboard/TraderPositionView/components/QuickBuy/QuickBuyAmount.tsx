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

  // In Buy mode the secondary crypto line shows the estimated dest (position token) amount.
  // In Sell mode it shows the estimated source (position token) amount consumed.
  // `estimatedReceiveAmount` is always the dest-token amount from the quote;
  // for Sell that IS the receive amount (stable), so we show the source amount instead.
  // The source token in Sell is the position token — use its balance display as the
  // secondary hint. When a quote is present, estimatedReceiveAmount is the stable
  // received; we show the source consumed from the quote (sourceAmount).
  const estimatedCryptoAmount =
    tradeMode === 'sell'
      ? estimatedReceiveAmount // for sell: est. stables received (secondary label)
      : estimatedReceiveAmount; // for buy: est. position token received

  // The symbol shown beside the secondary label.
  const cryptoSymbol =
    tradeMode === 'sell'
      ? (sourceToken?.symbol ?? target.tokenSymbol) // sell: receiving stable symbol
      : target.tokenSymbol; // buy: position token symbol

  return (
    <QuickBuyAmountSection
      amountDisplayMode={amountDisplayMode}
      tradeMode={tradeMode}
      fiatCryptoToggleEnabled={features.fiatCryptoToggle}
      usdAmount={usdAmount}
      destSymbol={cryptoSymbol}
      estimatedCryptoAmount={estimatedCryptoAmount}
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
