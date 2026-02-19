import { useSelector } from 'react-redux';
import { selectPredictActiveOrder } from '../selectors/predictController';

export function usePredictActiveOrder() {
  return useSelector(selectPredictActiveOrder);
}
