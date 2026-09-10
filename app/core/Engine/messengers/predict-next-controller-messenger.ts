import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
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
    namespace: 'PredictMarketDataService',
    parent: rootMessenger,
  }) as PredictNextControllerMessenger;

export type PredictNextControllerInitMessenger = Messenger<
  'PredictNextControllerInit',
  AuthenticationController.AuthenticationControllerGetBearerTokenAction,
  never
>;

export const getPredictNextControllerInitMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictNextControllerInitMessenger>,
    MessengerEvents<PredictNextControllerInitMessenger>
  >,
): PredictNextControllerInitMessenger => {
  const messenger: PredictNextControllerInitMessenger = new Messenger({
    namespace: 'PredictNextControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
};
