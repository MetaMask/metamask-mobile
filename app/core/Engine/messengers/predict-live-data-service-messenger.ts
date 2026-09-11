import { Messenger } from '@metamask/messenger';
import {
  PREDICT_LIVE_DATA_SERVICE_NAME,
  type PredictLiveDataServiceActions,
  type PredictLiveDataServiceEvents,
  type PredictLiveDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the Predict live-data service. This is scoped to the
 * actions and events that the Predict live-data service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PredictLiveDataServiceMessenger.
 */
export const getPredictLiveDataServiceMessenger = (
  rootMessenger: RootMessenger<
    PredictLiveDataServiceActions,
    PredictLiveDataServiceEvents
  >,
): PredictLiveDataServiceMessenger =>
  new Messenger({
    namespace: PREDICT_LIVE_DATA_SERVICE_NAME,
    parent: rootMessenger,
  });
