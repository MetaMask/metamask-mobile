import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BtcScope, EthScope } from '@metamask/keyring-api';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  setDestToken,
  selectDestToken,
  selectIsDestTokenManuallySet,
} from '../../../../../core/redux/slices/bridge';
import {
  getDefaultDestToken,
  getNativeSourceToken,
} from '../../utils/tokenUtils';
import { areAddressesEqual } from '../../../../../util/address';
import { BridgeToken } from '../../types';

/**
 * Hook that provides a function to auto-update the destination token when the source chain changes.
 * Assume same-chain swap when user hasn't explicitly set dest.
 *
 * The dest token is only updated if:
 * 1. The source chain has changed (new source is on different chain than current dest, works for flip button too)
 * 2. The user hasn't manually selected a destination token
 *
 * Special cases:
 * - Bitcoin source: defaults to ETH on Ethereum (same-chain swaps don't make sense for BTC)
 * - If default dest token equals source token: Not currently possible as we filter out that
 * token from the asset list, but the default case would be to fall back into native token.
 */
export const useAutoUpdateDestToken = () => {
  const dispatch = useDispatch();
  const selectedDestToken = useSelector(selectDestToken);
  const isDestTokenManuallySet = useSelector(selectIsDestTokenManuallySet);

  const autoUpdateDestToken = useCallback(
    (newSourceToken: BridgeToken) => {
      // Check if source chain has changed from current dest chain
      const sourceChainChanged =
        selectedDestToken?.chainId &&
        formatChainIdToCaip(newSourceToken.chainId) !==
          formatChainIdToCaip(selectedDestToken.chainId);

      // Only auto-update if chain changed AND dest wasn't manually set by user
      if (!sourceChainChanged || isDestTokenManuallySet) {
        return;
      }

      // For Bitcoin source, default to ETH on Ethereum
      // (same-chain swaps don't make sense for BTC)
      if (newSourceToken.chainId === BtcScope.Mainnet) {
        dispatch(setDestToken(getNativeSourceToken(EthScope.Mainnet)));
        return;
      }

      // For other chains, get the default dest token for the new source chain
      let defaultDestToken = getDefaultDestToken(newSourceToken.chainId);

      // Make sure source and dest tokens are different
      if (
        defaultDestToken &&
        areAddressesEqual(newSourceToken.address, defaultDestToken.address)
      ) {
        // Fall back to native token if default dest is same as source
        defaultDestToken = getNativeSourceToken(newSourceToken.chainId);
      }

      if (
        defaultDestToken &&
        !areAddressesEqual(newSourceToken.address, defaultDestToken.address)
      ) {
        dispatch(setDestToken(defaultDestToken));
      }
    },
    [dispatch, selectedDestToken, isDestTokenManuallySet],
  );

  return { autoUpdateDestToken };
};
