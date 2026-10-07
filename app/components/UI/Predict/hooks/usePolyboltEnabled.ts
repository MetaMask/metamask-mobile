import { useSelector } from 'react-redux';
import { selectPredictPolyboltEnabled } from '../selectors/featureFlags';

/**
 * @returns True when the crypto reference-price feed should use PolyBolt.
 */
export function usePolyboltEnabled(): boolean {
  return useSelector(selectPredictPolyboltEnabled);
}
