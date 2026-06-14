import React, { useCallback } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyTokenSelectList from './QuickBuyTokenSelectList';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Buy mode "Pay with" screen: lets the user pick which token they hold to pay
 * with. Wires the held-token options and source-token selection from context
 * into the shared token-list screen.
 */
const QuickBuyPayWithScreen: React.FC = () => {
  const {
    sourceTokenOptions,
    selectedSourceToken,
    handleSelectSourceToken,
    setActiveScreen,
  } = useQuickBuyContext();

  const handleBack = useCallback(
    () => setActiveScreen('amount'),
    [setActiveScreen],
  );

  const handleSelect = useCallback(
    (token: BridgeToken) => {
      handleSelectSourceToken(token);
      setActiveScreen('amount');
    },
    [handleSelectSourceToken, setActiveScreen],
  );

  return (
    <QuickBuyTokenSelectList
      title={strings('social_leaderboard.quick_buy.pay_with')}
      emptyLabel={strings('social_leaderboard.quick_buy.pay_with_no_tokens')}
      tokens={sourceTokenOptions}
      selectedToken={selectedSourceToken}
      onSelect={handleSelect}
      onBack={handleBack}
    />
  );
};

export default QuickBuyPayWithScreen;
