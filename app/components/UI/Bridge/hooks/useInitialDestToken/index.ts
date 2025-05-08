import { setDestToken } from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { selectChainId } from '../../../../../selectors/networkController';
import { RouteProp, useRoute } from '@react-navigation/native';
import { BridgeRouteParams } from '../../Views/BridgeView';
import { BridgeViewMode, BridgeToken } from '../../types';

// Need to pass in the initial source token to avoid a race condition with useInitialSourceToken
// Can't just use selectSourceToken because of race condition
export const useInitialDestToken = (initialSourceToken?: BridgeToken) => {
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);

  const isSwap = route.params.bridgeViewMode === BridgeViewMode.Swap;

  useEffect(() => {
    const defaultDestToken = DefaultSwapDestTokens[chainId];
    if (
      isSwap &&
      defaultDestToken &&
      initialSourceToken?.address !== defaultDestToken.address
    ) {
      dispatch(setDestToken(defaultDestToken));
    }
  }, [dispatch, chainId, isSwap, initialSourceToken?.address]);
};
