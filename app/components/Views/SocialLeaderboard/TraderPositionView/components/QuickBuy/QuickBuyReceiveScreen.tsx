import type { CaipChainId } from '@metamask/utils';
import React, { useCallback, useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyTokenSelectList from './QuickBuyTokenSelectList';
import { useQuickBuyContext } from './useQuickBuyContext';
import { toFilterChainId } from './utils/toFilterChainId';

/**
 * Sell mode "Receive" screen: lets the user pick which token (stablecoin or
 * native) they receive when selling their position. Wires the receive options
 * and dest selection from context into the shared token-list screen, defaulting
 * the chain filter to the position's chain when candidates exist there.
 */
const QuickBuyReceiveScreen: React.FC = () => {
  const {
    target,
    sellDestTokenOptions,
    selectedDestStable,
    handleSelectDestStable,
    setActiveScreen,
  } = useQuickBuyContext();

  // Default the chain filter to the position chain only when at least one
  // receive candidate exists on it — avoids an immediately-empty list.
  const defaultChainId = useMemo(() => {
    // `target.chain` is already a CAIP id — `positionToQuickBuyTarget` does the
    // chain-name → CAIP conversion when the target is built. Receive candidates
    // carry hex chain ids on EVM and CAIP ids on non-EVM (e.g. Solana), so the
    // filter id must match the candidate format.
    const chainFilterId = toFilterChainId(target.chain as CaipChainId);
    if (chainFilterId === null) {
      return null;
    }
    return sellDestTokenOptions.some((t) => t.chainId === chainFilterId)
      ? chainFilterId
      : null;
  }, [target.chain, sellDestTokenOptions]);

  const handleBack = useCallback(
    () => setActiveScreen('amount'),
    [setActiveScreen],
  );

  const handleSelect = useCallback(
    (token: BridgeToken) => {
      handleSelectDestStable(token);
      setActiveScreen('amount');
    },
    [handleSelectDestStable, setActiveScreen],
  );

  return (
    <QuickBuyTokenSelectList
      title={strings('social_leaderboard.quick_buy.receive')}
      emptyLabel={strings(
        'social_leaderboard.quick_buy.receive_with_no_tokens',
      )}
      tokens={sellDestTokenOptions}
      selectedToken={selectedDestStable}
      onSelect={handleSelect}
      onBack={handleBack}
      defaultChainId={defaultChainId}
    />
  );
};

export default QuickBuyReceiveScreen;
