import packageJSON from '../../../../package.json';
import { KalshiRemoteAdapter } from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../../../components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import { unavailableReadTransport } from '../../../components/UI/PredictNext/adapters/remote/unavailableTransports';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import Logger from '../../../util/Logger';
import type { MessengerClientInitFunction } from '../types';
import { resolvePredictApiBaseUrl } from './predict-next-config';

/**
 * Initialize the Predict market-data service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const predictMarketDataServiceInit: MessengerClientInitFunction<
  PredictMarketDataService,
  PredictMarketDataServiceMessenger
> = ({ controllerMessenger }) => {
  const baseUrl = resolvePredictApiBaseUrl(process.env.MM_PREDICT_API_URL);

  if (!baseUrl) {
    Logger.log(
      'PredictNext is unconfigured. Market-data reads will report the feature as disabled.',
    );
  }

  const transport = baseUrl
    ? new PredictApiReadClient({
        baseUrl,
        clientVersion: packageJSON.version,
      })
    : unavailableReadTransport;
  const adapter = new KalshiRemoteAdapter(transport);

  const controller = new PredictMarketDataService({
    messenger: controllerMessenger,
    marketData: adapter.marketData,
    venueId: adapter.venueId,
  });

  return { controller };
};
