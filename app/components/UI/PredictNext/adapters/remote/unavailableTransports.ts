import { PredictError, PredictErrorCode } from '../../errors';
import type { PredictApiReadTransport } from './PredictApiReadClient';
import type { PredictLiveDataTransport } from './PredictLiveDataClient';

const reject = async (): Promise<never> => {
  throw PredictError.from(PredictErrorCode.FEATURE_DISABLED);
};

/**
 * Read transport for builds without a Predict API URL. `FEATURE_DISABLED` is
 * non-retryable, so reads fail immediately instead of burning retries and
 * tripping the service circuit breaker.
 */
export const unavailableReadTransport: PredictApiReadTransport = {
  fetchVenueStatus: reject,
  fetchFeed: reject,
  fetchEvent: reject,
  fetchMarketHistory: reject,
};

/** Live transport for builds without a Predict API URL. */
export const unavailableLiveTransport: PredictLiveDataTransport = {
  subscribe: () => undefined,
  unsubscribe: () => undefined,
  destroy: () => undefined,
};
