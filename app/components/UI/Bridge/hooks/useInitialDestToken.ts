import { setDestToken } from '../../../../core/redux/slices/bridge';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';
import { selectChainId } from '../../../../selectors/networkController';
import { RouteProp , useRoute } from '@react-navigation/native';
import { BridgeRouteParams , BridgeViewTitle } from './useInitialSourceToken';

export const useInitialDestToken = () => {
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const dispatch = useDispatch();
  const chainId = useSelector(selectChainId);

  const isSwap = route.params.title === BridgeViewTitle.Swaps;

  useEffect(() => {
    const defaultDestToken = DefaultSwapDestTokens[chainId];
    if (isSwap && defaultDestToken) {
      dispatch(setDestToken(defaultDestToken));
    }
  }, [dispatch, chainId, isSwap]);
};
