import { setDestToken, selectDestToken, selectBridgeViewMode } from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { selectChainId } from '../../../../../selectors/networkController';
import { BridgeViewMode, BridgeToken } from '../../types';
import { getNativeSourceToken } from '../useInitialSourceToken';

// Need to pass in the initial source token to avoid a race condition with useInitialSourceToken
// Can't just use selectSourceToken because of race condition
export const useInitialDestToken = (initialSourceToken?: BridgeToken) => {
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
  const destToken  = useSelector(selectDestToken);
  const bridgeViewMode = useSelector(selectBridgeViewMode);

  const isSwap = bridgeViewMode === BridgeViewMode.Swap || bridgeViewMode === BridgeViewMode.Unified;

  if (destToken) return;

  let defaultDestToken = DefaultSwapDestTokens[chainId];

  // If the initial source token is the same as the default dest token, set the default dest token to the native token
  if (initialSourceToken?.address === defaultDestToken?.address) {
    defaultDestToken = getNativeSourceToken(chainId);
  }

  if (
    isSwap &&
    defaultDestToken &&
    initialSourceToken?.address !== defaultDestToken.address
  ) {
    dispatch(setDestToken(defaultDestToken));
  }
};
