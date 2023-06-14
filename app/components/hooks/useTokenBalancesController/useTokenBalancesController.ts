import { useSelector } from 'react-redux';
import { EngineState } from '../../../selectors/types';
import useDeepComparisonMemo from '../useDeepComparisonMemo/useDeepComparisonMemo';
import { isEqual } from 'lodash';

const useTokenBalancesController = () => {
  const tokenBalances = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState?.TokenBalancesController?.contractBalances,
    isEqual,
  );

  const tokenBalancesData = useDeepComparisonMemo(
    () => tokenBalances,
    [tokenBalances],
  );

  return { data: tokenBalancesData };
};

export default useTokenBalancesController;
