import { useSelector } from 'react-redux';
import { EngineState } from '../../../selectors/types';
import { isEqual } from 'lodash';

const useTokenBalancesController = () => {
  const tokenBalances = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState?.TokenBalancesController?.contractBalances,
    isEqual,
  );

  return { data: tokenBalances };
};

export default useTokenBalancesController;
