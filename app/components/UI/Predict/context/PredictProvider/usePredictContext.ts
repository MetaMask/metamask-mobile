import { useContext } from 'react';
import { PredictContext } from './PredictProvider';
import { PredictContextValue } from './PredictProvider.types';

export const usePredictContext = (): PredictContextValue => {
  const context = useContext(PredictContext);
  if (!context) {
    throw new Error('usePredictContext must be used within a PredictProvider');
  }
  return context;
};

export const usePredictContextSafe = (): PredictContextValue | null =>
  useContext(PredictContext);
