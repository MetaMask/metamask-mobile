import packageJSON from '../../../../package.json';
import { KalshiRemoteAdapter } from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../../../components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import {
  PredictPortfolioService,
  type PredictPortfolioServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import type { PredictPortfolioServiceInitMessenger } from '../messengers/predict-portfolio-service-messenger';
import type { MessengerClientInitFunction } from '../types';

export const predictMarketDataServiceInit: MessengerClientInitFunction<
  PredictMarketDataService,
  PredictMarketDataServiceMessenger
> = ({ controllerMessenger }) => {
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: process.env.MM_PREDICT_API_URL,
      clientVersion: packageJSON.version,
    }),
  );
  return {
    controller: new PredictMarketDataService({
      messenger: controllerMessenger,
      marketData: adapter.marketData,
      venueId: adapter.venueId,
    }),
  };
};

export const predictPortfolioServiceInit: MessengerClientInitFunction<
  PredictPortfolioService,
  PredictPortfolioServiceMessenger,
  PredictPortfolioServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: process.env.MM_PREDICT_API_URL,
      clientVersion: packageJSON.version,
      getBearerToken: () =>
        initMessenger.call('AuthenticationController:getBearerToken'),
    }),
  );
  return {
    controller: new PredictPortfolioService({
      messenger: controllerMessenger,
      portfolio: adapter.portfolio,
      venueId: adapter.venueId,
    }),
  };
};
