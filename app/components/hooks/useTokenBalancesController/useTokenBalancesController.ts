import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {shallowEqual, useSelector} from 'react-redux';
import {EngineState} from "../../../selectors/types";
import useDeepComparisonMemo from "../useDeepComparisonMemo";

const useTokenBalancesController = (renderWitness = ()=> {}) => {

  const tokenBalances = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState?.TokenBalancesController?.contractBalances,
    shallowEqual
  );

  const tokenBalancesData = useDeepComparisonMemo(() => {
    renderWitness();// TODO: remove this but how to test that the render happens or not?
    return tokenBalances;
  }, [tokenBalances]);

  return { data: tokenBalancesData };
};

export default useTokenBalancesController;
