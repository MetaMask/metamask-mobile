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
 * Hook that provides a function to auto-update the destination token when the source changes.
 * Assume same-chain swap when user hasn't explicitly set dest.
 *
 * The dest token is updated if:
 * 1. The source chain has changed (new source is on different chain than current dest)
 * 2. Same-chain but dest needs correction (e.g., dest is native fallback but source no longer conflicts with default dest, or source now conflicts with current dest)
 * 3. The user hasn't manually selected a destination token
 *
 * Special cases:
 * - Bitcoin source: defaults to ETH on Ethereum (same-chain swaps don't make sense for BTC)
 * - If default dest token equals source token: falls back to native token
 * - If no default dest exists for chain: falls back to native token
 */
export const useAutoUpdateDestToken = () => {
  const dispatch = useDispatch();
  const selectedDestToken = useSelector(selectDestToken);
  const isDestTokenManuallySet = useSelector(selectIsDestTokenManuallySet);

  const autoUpdateDestToken = useCallback(
    (newSourceToken: BridgeToken) => {
      // Never auto-update if dest was manually set by user
      if (isDestTokenManuallySet) {
        return;
      }

      // No dest token set yet, nothing to update from
      if (!selectedDestToken?.chainId) {
        return;
      }

      // For Bitcoin source, default to ETH on Ethereum
      // (same-chain swaps don't make sense for BTC)
      if (newSourceToken.chainId === BtcScope.Mainnet) {
        if (
          !areAddressesEqual(
            selectedDestToken.address,
            getNativeSourceToken(EthScope.Mainnet).address,
          ) ||
          formatChainIdToCaip(selectedDestToken.chainId) !== EthScope.Mainnet
        ) {
          dispatch(setDestToken(getNativeSourceToken(EthScope.Mainnet)));
        }
        return;
      }

      // Calculate what the dest token should be based on the new source
      const defaultDestToken = getDefaultDestToken(newSourceToken.chainId);
      const nativeToken = getNativeSourceToken(newSourceToken.chainId);

      let expectedDestToken: BridgeToken | undefined;

      // Determine expected dest token
      if (
        defaultDestToken &&
        !areAddressesEqual(newSourceToken.address, defaultDestToken.address)
      ) {
        // Default dest is valid (doesn't conflict with source)
        expectedDestToken = defaultDestToken;
      } else if (
        !areAddressesEqual(newSourceToken.address, nativeToken.address)
      ) {
        // Fall back to native token if:
        // 1. No default dest token exists for this chain, OR
        // 2. Default dest equals source token
        expectedDestToken = nativeToken;
      }

      // Only dispatch if expected dest is different from current dest
      if (
        expectedDestToken &&
        (!areAddressesEqual(
          selectedDestToken.address,
          expectedDestToken.address,
        ) ||
          formatChainIdToCaip(selectedDestToken.chainId) !==
            formatChainIdToCaip(expectedDestToken.chainId))
      ) {
        dispatch(setDestToken(expectedDestToken));
      }
    },
    [dispatch, selectedDestToken, isDestTokenManuallySet],
  );

  return { autoUpdateDestToken };
};
