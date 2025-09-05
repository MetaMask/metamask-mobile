import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';

export const usePredictOrder = (transactionId?: string) => {
  const selectPredictOrderState = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => {
      if (!predictState || !transactionId) {
        return {
          status: 'idle',
          currentTxHash: null as string | null,
          error: null as string | null,
        };
      }

      return {
        status: predictState.activeOrders[transactionId]?.status || 'idle',
        currentTxHash:
          predictState.activeOrders[transactionId]?.txMeta.hash || null,
        error: predictState.activeOrders[transactionId]?.txMeta.error || null,
      };
    },
  );
  return useSelector(selectPredictOrderState);
};
