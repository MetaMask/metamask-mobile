import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { selectChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { removeEvmToken, removeNonEvmToken } from '../util';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { getDecimalChainId } from '../../../../util/networks';
import { strings } from '../../../../../locales/i18n';
import type { TokenI } from '../types';

type RemoveTokenState =
  | { isVisible: true; token: TokenI }
  | { isVisible: false };

/**
 * Encapsulates the state and callbacks for the token hide/remove flow.
 * Used by both the homepage TokensSection and the full-view Tokens component
 * to avoid duplicating the removal logic.
 */
export const useRemoveToken = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const currentChainId = useSelector(selectChainId);
  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const [removeTokenState, setRemoveTokenState] = useState<RemoveTokenState>({
    isVisible: false,
  });
  const [showScamWarningModal, setShowScamWarningModal] = useState(false);

  const showRemoveMenu = useCallback((token: TokenI) => {
    setRemoveTokenState({ isVisible: true, token });
  }, []);

  const removeToken = useCallback(async () => {
    if (!removeTokenState.isVisible) return;

    const tokenToRemove = removeTokenState.token;
    setRemoveTokenState({ isVisible: false });

    if (tokenToRemove?.chainId !== undefined) {
      if (isNonEvmChainId(tokenToRemove.chainId)) {
        await removeNonEvmToken({
          tokenAddress: tokenToRemove.address,
          tokenChainId: tokenToRemove.chainId,
          selectInternalAccountByScope,
        });
      } else {
        await removeEvmToken({
          tokenToRemove,
          currentChainId,
          trackEvent,
          strings,
          getDecimalChainId,
          createEventBuilder,
        });
      }
    }
  }, [
    removeTokenState,
    currentChainId,
    trackEvent,
    createEventBuilder,
    selectInternalAccountByScope,
  ]);

  const handleClose = useCallback(() => {
    setRemoveTokenState({ isVisible: false });
  }, []);

  return {
    removeTokenState,
    showRemoveMenu,
    removeToken,
    handleClose,
    showScamWarningModal,
    setShowScamWarningModal,
  };
};
