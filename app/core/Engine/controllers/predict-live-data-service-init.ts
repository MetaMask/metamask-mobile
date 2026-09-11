import { PredictLiveDataClient } from '../../../components/UI/PredictNext/adapters/remote/PredictLiveDataClient';
import { unavailableLiveTransport } from '../../../components/UI/PredictNext/adapters/remote/unavailableTransports';
import {
  PredictLiveDataService,
  type PredictLiveDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/types';
import Logger from '../../../util/Logger';
import type { MessengerClientInitFunction } from '../types';
import { resolvePredictApiBaseUrl } from './predict-next-config';

/**
 * Initialize the Predict live-data service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const predictLiveDataServiceInit: MessengerClientInitFunction<
  PredictLiveDataService,
  PredictLiveDataServiceMessenger
> = ({ controllerMessenger }) => {
  const baseUrl = resolvePredictApiBaseUrl(process.env.MM_PREDICT_API_URL);

  if (!baseUrl) {
    Logger.log('PredictNext is unconfigured. Live game updates are disabled.');
  }

  // The client and the service are mutually dependent: the socket feeds updates
  // into the service, which publishes them on the messenger.
  const serviceRef: { current?: PredictLiveDataService } = {};
  const client = baseUrl
    ? new PredictLiveDataClient({
        baseUrl,
        onGameUpdate: (update) => serviceRef.current?.onGameUpdate(update),
      })
    : unavailableLiveTransport;

  const controller = new PredictLiveDataService({
    messenger: controllerMessenger,
    client,
    venueId: KALSHI_VENUE_ID,
  });
  serviceRef.current = controller;

  return { controller };
};
