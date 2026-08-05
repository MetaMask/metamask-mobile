import type { CaipChainId } from '@metamask/utils';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyTokenSelectList from './QuickBuyTokenSelectList';
import { useQuickBuyContext } from './useQuickBuyContext';
import { toFilterChainId } from './utils/toFilterChainId';

/**
 * Buy mode "Pay with" screen: lets the user pick which token they hold to pay
 * with. Wires the held-token options and source-token selection from context
 * into the shared token-list screen.
 */
const QuickBuyPayWithScreen: React.FC = () => {
  const {
    target,
    sourceTokenOptions,
    selectedSourceToken,
    handleSelectSourceToken,
    setActiveScreen,
  } = useQuickBuyContext();

  // Surface the viewed token's network first in the chain filter pills. The
  // list ignores it when no held token is on that chain.
  const priorityChainId = useMemo(
    () => toFilterChainId(target.chain as CaipChainId),
    [target.chain],
  );

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
      priorityChainId={priorityChainId}
    />
  );
};

export default QuickBuyPayWithScreen;
