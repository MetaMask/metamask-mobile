import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../core/Engine';
import { getAllowedSmartTransactionsChainIds } from '../../constants/smartTransactions';
import { isNonEvmChainId } from '../../core/Multichain/utils';
import { selectSmartTransactionsOptInStatus } from '../../selectors/preferencesController';
import {
  isCaipChainId,
  parseCaipChainId,
  Hex,
  CaipChainId,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';

/**
 * Hook that fetches smart transactions liveness for a given chain.
 * Ensures fresh liveness data is fetched when entering the page
 * and when the chain changes.
 *
 * @param chainId - The chain ID to check for STX support (string or null/undefined).
 *
 */
export function useRefreshSmartTransactionsLiveness(
  chainId: Hex | CaipChainId | null | undefined,
): void {
  const smartTransactionsOptInStatus = useSelector(
    selectSmartTransactionsOptInStatus,
  );

  useEffect(() => {
    if (!chainId || !smartTransactionsOptInStatus) {
      return;
    }

    if (isNonEvmChainId(chainId)) {
      return;
    }

    const chainIdHex = isCaipChainId(chainId)
      ? toHex(parseCaipChainId(chainId).reference)
      : chainId;

    // TODO: will be replaced with feature flags once we have them.
    const allowedChainId = getAllowedSmartTransactionsChainIds().find(
      (id) => id === chainIdHex,
    );

    if (allowedChainId) {
      Engine.context.SmartTransactionsController.fetchLiveness({
        chainId: allowedChainId,
      });
    }
  }, [chainId, smartTransactionsOptInStatus]);
}
