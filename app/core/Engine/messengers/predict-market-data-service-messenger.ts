import { Messenger } from '@metamask/messenger';
import {
  PREDICT_MARKET_DATA_SERVICE_NAME,
  type PredictMarketDataServiceActions,
  type PredictMarketDataServiceEvents,
  type PredictMarketDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the Predict market-data service. This is scoped to the
 * actions and events that the Predict market-data service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PredictMarketDataServiceMessenger.
 */
export const getPredictMarketDataServiceMessenger = (
  rootMessenger: RootMessenger<
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >,
): PredictMarketDataServiceMessenger =>
  new Messenger({
    namespace: PREDICT_MARKET_DATA_SERVICE_NAME,
    parent: rootMessenger,
  });
