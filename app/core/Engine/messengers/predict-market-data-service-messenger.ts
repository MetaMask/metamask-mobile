import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { PredictMarketDataServiceMessenger } from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import type { RootMessenger } from '../types';

export const getPredictMarketDataServiceMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictMarketDataServiceMessenger>,
    MessengerEvents<PredictMarketDataServiceMessenger>
  >,
): PredictMarketDataServiceMessenger =>
  new Messenger({
    namespace: 'PredictMarketDataService',
    parent: rootMessenger,
  });
