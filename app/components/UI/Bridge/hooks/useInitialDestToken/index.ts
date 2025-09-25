import {
  setDestToken,
  selectBridgeViewMode,
  selectDestToken,
} from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { getDefaultDestToken } from '../../utils/tokenUtils';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeViewMode, BridgeToken } from '../../types';
import { getNativeSourceToken } from '../useInitialSourceToken';
import { SolScope } from '@metamask/keyring-api';
import usePrevious from '../../../../hooks/usePrevious';

// Need to pass in the initial source token to avoid a race condition with useInitialSourceToken
// Can't just use selectSourceToken because of race condition
export const useInitialDestToken = (
  initialSourceToken?: BridgeToken,
  initialDestToken?: BridgeToken,
) => {
  const dispatch = useDispatch();
  const selectedChainId = useSelector(selectChainId);
  const bridgeViewMode = useSelector(selectBridgeViewMode);
  const destToken = useSelector(selectDestToken);

  const isSwap =
    bridgeViewMode === BridgeViewMode.Swap ||
    bridgeViewMode === BridgeViewMode.Unified;

  const prevInitialDestToken = usePrevious(initialDestToken);

  if (initialDestToken && prevInitialDestToken !== initialDestToken) {
    dispatch(setDestToken(initialDestToken));
    return;
  }

  const destTokenTargetChainId = initialSourceToken?.chainId ?? selectedChainId;
  let defaultDestToken = getDefaultDestToken(destTokenTargetChainId);

  // If the initial source token is the same as the default dest token, set the default dest token to the native token
  if (
    destTokenTargetChainId === SolScope.Mainnet &&
    initialSourceToken?.address === defaultDestToken?.address
  ) {
    // Solana addresses are case sensitive
    defaultDestToken = getNativeSourceToken(destTokenTargetChainId);
  } else if (
    destTokenTargetChainId !== SolScope.Mainnet &&
    initialSourceToken?.address?.toLowerCase() ===
      defaultDestToken?.address?.toLowerCase()
  ) {
    // EVM addresses are NOT case sensitive
    defaultDestToken = getNativeSourceToken(destTokenTargetChainId);
  }

  if (
    isSwap &&
    !destToken &&
    defaultDestToken &&
    initialSourceToken?.address !== defaultDestToken.address
  ) {
    dispatch(setDestToken(defaultDestToken));
  }
};
