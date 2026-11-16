import { useSelector } from 'react-redux';
import { selectPredictAvailability } from './selectPredictAvailability';

/** Whether Predict entry points show. See {@link selectPredictAvailability}. */
export const usePredictAvailability = (): boolean =>
  useSelector(selectPredictAvailability);
