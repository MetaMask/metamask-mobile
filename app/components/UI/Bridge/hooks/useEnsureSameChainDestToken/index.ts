import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { setDestToken } from '../../../../../core/redux/slices/bridge';
import { areAddressesEqual } from '../../../../../util/address';
import type { BridgeToken } from '../../types';
import {
  getDefaultDestToken,
  getNativeSourceToken,
} from '../../utils/tokenUtils';

interface EnsureSameChainDestTokenParams {
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
}

/**
 * Replaces a stale cross-chain destination for order types that only support
 * same-chain trades.
 *
 * @param params - The currently selected source and destination tokens.
 */
export function useEnsureSameChainDestToken({
  sourceToken,
  destToken,
}: EnsureSameChainDestTokenParams): void {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!sourceToken?.chainId || !destToken?.chainId) {
      return;
    }

    const sourceChainCaip = formatChainIdToCaip(sourceToken.chainId);
    const destChainCaip = formatChainIdToCaip(destToken.chainId);
    if (sourceChainCaip === destChainCaip) {
      return;
    }

    const defaultDestToken = getDefaultDestToken(sourceToken.chainId);
    const nativeToken = getNativeSourceToken(sourceToken.chainId);
    const nextDestToken =
      defaultDestToken &&
      !areAddressesEqual(sourceToken.address, defaultDestToken.address)
        ? defaultDestToken
        : nativeToken;

    dispatch(setDestToken(nextDestToken));
  }, [sourceToken, destToken, dispatch]);
}
