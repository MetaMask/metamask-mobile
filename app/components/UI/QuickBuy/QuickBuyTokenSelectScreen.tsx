import React from 'react';
import QuickBuyPayWithScreen from './QuickBuyPayWithScreen';
import QuickBuyReceiveScreen from './QuickBuyReceiveScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Routes the shared token-select route to the correct situation: the buy-mode
 * "Pay with" picker or the sell-mode "Receive" picker. Keeps the two flows
 * cleanly separated while sharing a single `activeScreen` value.
 */
const QuickBuyTokenSelectScreen: React.FC = () => {
  const { tradeMode } = useQuickBuyContext();
  return tradeMode === 'sell' ? (
    <QuickBuyReceiveScreen />
  ) : (
    <QuickBuyPayWithScreen />
  );
};

export default QuickBuyTokenSelectScreen;
