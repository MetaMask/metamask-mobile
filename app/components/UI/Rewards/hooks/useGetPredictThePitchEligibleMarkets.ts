import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPredictThePitchEligibleMarkets,
  selectPredictThePitchEligibleMarketsLoading,
  selectPredictThePitchEligibleMarketsError,
} from '../../../../reducers/rewards/selectors';
import {
  setPredictThePitchEligibleMarkets,
  setPredictThePitchEligibleMarketsLoading,
  setPredictThePitchEligibleMarketsError,
} from '../../../../reducers/rewards';

export interface UseGetPredictThePitchEligibleMarketsResult {
  eligibleMarkets: ReturnType<typeof selectPredictThePitchEligibleMarkets>;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetPredictThePitchEligibleMarkets =
  (): UseGetPredictThePitchEligibleMarketsResult => {
    const dispatch = useDispatch();
    const eligibleMarkets = useSelector(selectPredictThePitchEligibleMarkets);
    const isLoading = useSelector(selectPredictThePitchEligibleMarketsLoading);
    const hasError = useSelector(selectPredictThePitchEligibleMarketsError);

    const fetchEligibleMarkets = useCallback(async (): Promise<void> => {
      try {
        dispatch(setPredictThePitchEligibleMarketsLoading(true));
        dispatch(setPredictThePitchEligibleMarketsError(false));
        const result = await Engine.controllerMessenger.call(
          'RewardsController:getPredictThePitchEligibleMarkets',
        );
        dispatch(setPredictThePitchEligibleMarkets(result));
      } catch {
        dispatch(setPredictThePitchEligibleMarketsError(true));
      } finally {
        dispatch(setPredictThePitchEligibleMarketsLoading(false));
      }
    }, [dispatch]);

    useEffect(() => {
      fetchEligibleMarkets();
    }, [fetchEligibleMarkets]);

    return {
      eligibleMarkets,
      isLoading,
      hasError,
      refetch: fetchEligibleMarkets,
    };
  };

export default useGetPredictThePitchEligibleMarkets;
