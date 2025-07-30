import {
  setDestToken,
  selectDestToken,
  selectBridgeViewMode,
} from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeViewMode, BridgeToken } from '../../types';
import { getNativeSourceToken } from '../useInitialSourceToken';
import { SolScope } from '@metamask/keyring-api';

// Need to pass in the initial source token to avoid a race condition with useInitialSourceToken
// Can't just use selectSourceToken because of race condition
export const useInitialDestToken = (
  initialSourceToken?: BridgeToken,
  initialDestToken?: BridgeToken,
) => {
  const dispatch = useDispatch();
  const selectedChainId = useSelector(selectChainId);
  const destToken = useSelector(selectDestToken);
  const bridgeViewMode = useSelector(selectBridgeViewMode);

  const isSwap =
    bridgeViewMode === BridgeViewMode.Swap ||
    bridgeViewMode === BridgeViewMode.Unified;

  if (destToken) return;

  if (initialDestToken) {
    dispatch(setDestToken(initialDestToken));
    return;
  }

  const destTokenTargetChainId = initialSourceToken?.chainId ?? selectedChainId;
  let defaultDestToken = DefaultSwapDestTokens[destTokenTargetChainId];

  // If the initial source token is the same as the default dest token, set the default dest token to the native token
  if (
    destTokenTargetChainId === SolScope.Mainnet &&
    initialSourceToken?.address === defaultDestToken?.address
  ) {
    // Solana addresses care case sensitive
    defaultDestToken = getNativeSourceToken(destTokenTargetChainId);
  } else if (
    destTokenTargetChainId !== SolScope.Mainnet &&
    initialSourceToken?.address.toLowerCase() ===
      defaultDestToken?.address.toLowerCase()
  ) {
    // EVM addresses are NOT case sensitive
    defaultDestToken = getNativeSourceToken(destTokenTargetChainId);
  }

  if (
    isSwap &&
    defaultDestToken &&
    initialSourceToken?.address !== defaultDestToken.address
  ) {
    dispatch(setDestToken(defaultDestToken));
  }
};
