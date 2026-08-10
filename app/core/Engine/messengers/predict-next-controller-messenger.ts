import { Messenger } from '@metamask/messenger';
import type { PredictNextControllerMessenger } from '../../../components/UI/PredictNext/controller/PredictNextController';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import type { RootMessenger } from '../types';

export const getPredictNextControllerMessenger = (
  rootMessenger: RootMessenger<
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >,
): PredictNextControllerMessenger =>
  new Messenger({
    namespace: 'PredictNextController',
    parent: rootMessenger,
  });
