import { setDestToken, selectDestToken } from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { selectChainId } from '../../../../../selectors/networkController';
import { RouteProp, useRoute } from '@react-navigation/native';
import { BridgeRouteParams } from '../../Views/BridgeView';
import { BridgeViewMode, BridgeToken } from '../../types';
import { getNativeSourceToken } from '../useInitialSourceToken';

// Need to pass in the initial source token to avoid a race condition with useInitialSourceToken
// Can't just use selectSourceToken because of race condition
export const useInitialDestToken = (initialSourceToken?: BridgeToken) => {
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);
  const destToken  = useSelector(selectDestToken);

  const isSwap = route.params.bridgeViewMode === BridgeViewMode.Swap;

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
