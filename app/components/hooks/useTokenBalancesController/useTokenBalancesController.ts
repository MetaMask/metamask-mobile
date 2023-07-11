import { useSelector } from 'react-redux';
import { EngineState } from '../../../selectors/types';
import { isEqual } from 'lodash';
import { ControllerHookType } from '../controllerHook.types';
import { BN } from 'ethereumjs-util';

interface TokenBalances {
  [address: string]: BN;
}

const useTokenBalancesController = (): ControllerHookType<TokenBalances> => {
  const tokenBalances = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState?.TokenBalancesController?.contractBalances,
    isEqual,
  );

  return { data: tokenBalances };
};

export default useTokenBalancesController;
export type { TokenBalances };
