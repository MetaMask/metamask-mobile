import { usePredictImplementation } from '../implementation';

/**
 * Whether the Active Venue has Explore prediction content: true on the legacy
 * lane. False while the Active Venue resolves and for next Venues until
 * PRED-1408 builds their Explore sections, so a caller leaves a section out
 * instead of rendering it empty. Predict availability is a separate gate.
 */
export const usePredictTrendingSupported = (): boolean => {
  const resolution = usePredictImplementation();
  return (
    resolution.status === 'ready' && resolution.implementation === 'legacy'
  );
};
