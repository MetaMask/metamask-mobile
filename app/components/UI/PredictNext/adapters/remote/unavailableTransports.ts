import type { PredictLiveDataTransport } from './PredictLiveDataClient';

/** Live transport for builds without a Predict API URL. */
export const unavailableLiveTransport: PredictLiveDataTransport = {
  subscribe: () => undefined,
  unsubscribe: () => [],
  destroy: () => undefined,
};
