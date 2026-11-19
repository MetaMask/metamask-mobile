import { useCallback } from 'react';
import { usePredictEntryActions } from '../../../../navigation/entry';

/** Opens Predict Home for the Active Venue: the details screens' CTA. */
export function useOpenPredictHome() {
  const { openPredict } = usePredictEntryActions();

  return useCallback(() => {
    openPredict({ type: 'home' });
  }, [openPredict]);
}
