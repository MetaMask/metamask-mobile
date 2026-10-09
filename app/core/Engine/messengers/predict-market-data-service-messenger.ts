import type { AuthenticationController } from '@metamask/profile-sync-controller';
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

export type PredictMarketDataServiceInitMessenger = Messenger<
  'PredictMarketDataServiceInit',
  AuthenticationController.AuthenticationControllerGetBearerTokenAction,
  never
>;

export const getPredictMarketDataServiceInitMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictMarketDataServiceInitMessenger>,
    MessengerEvents<PredictMarketDataServiceInitMessenger>
  >,
): PredictMarketDataServiceInitMessenger => {
  const messenger: PredictMarketDataServiceInitMessenger = new Messenger({
    namespace: 'PredictMarketDataServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
};
