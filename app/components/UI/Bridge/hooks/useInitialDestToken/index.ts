import { setDestToken } from '../../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { DefaultSwapDestTokens } from '../../constants/default-swap-dest-tokens';
import { selectChainId } from '../../../../../selectors/networkController';
import { RouteProp , useRoute } from '@react-navigation/native';
import { BridgeRouteParams } from '../useInitialSourceToken';
import { BridgeViewMode } from '../../types';

export const useInitialDestToken = () => {
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);

  const isSwap = route.params.bridgeViewMode === BridgeViewMode.Swap;

  useEffect(() => {
    const defaultDestToken = DefaultSwapDestTokens[chainId];
    if (isSwap && defaultDestToken) {
      dispatch(setDestToken(defaultDestToken));
    }
  }, [dispatch, chainId, isSwap]);
};
