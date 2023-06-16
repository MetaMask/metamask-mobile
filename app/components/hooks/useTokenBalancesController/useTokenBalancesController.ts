import { useSelector } from 'react-redux';
import { EngineState } from '../../../selectors/types';
import { isEqual } from 'lodash';
import { ControllerHookType } from '../controllerHook.types';

const useTokenBalancesController = (): ControllerHookType => {
  const tokenBalances = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState?.TokenBalancesController?.contractBalances,
    isEqual,
  );

  return { data: tokenBalances };
};

export default useTokenBalancesController;
