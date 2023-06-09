import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {EngineState} from "../../../selectors/types";

const useTokenBalancesController = () => {
  const tokenBalances = useSelector(
    (state: EngineState) =>
      state.engine.backgroundState?.TokenBalancesController?.contractBalances,
  );

  // Derive loading from balances.
  const [isLoading, setIsLoading] = useState(true);

  const tokenBalanceError = useMemo(() => {
    // TODO the error condition has to be improved when we have a better error handling on the controller side
    if(!isLoading && !tokenBalances) {
      return new Error('TokenBalancesController - no balances found');
    }
  }, [isLoading, tokenBalances]);

  // Derive error from balances.
  const [error, setError] = useState<Error>();

  // Expose ability to retry.
  const tokenBalanceControllerRef = useRef();
  // TODO later add retry method to TokenBalanceController
  // const onRetry = useCallback(() => tokenBalanceControllerRef.current?.retry(), []);
  const onRetry = useCallback(() => true, []);

  // TODO later add init method to TokenBalanceController
  // useEffect(() => {
  //   // Will either initialize or use existing Singleton.
  //   tokenBalanceControllerRef.current = TokenBalanceController.init();
  // }, []);

  // Update loading and error states.
  useEffect(() => {
    console.log('useTokenBalancesController - tokenBalances', tokenBalances)
    if (tokenBalances && Object.keys(tokenBalances).length > 0) {
      setIsLoading(false);
      setError(tokenBalanceError);
    }
  }, [tokenBalances, tokenBalanceError]);

  return { data: tokenBalances, loading: isLoading, error };
};

export default useTokenBalancesController;
