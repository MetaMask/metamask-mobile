import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type {
  PredictNextControllerActions,
  PredictNextControllerEvents,
  PredictNextControllerMessenger,
} from '../../../components/UI/PredictNext/controller/PredictNextController';
import type { RootMessenger } from '../types';

export const getPredictNextControllerMessenger = (
  rootMessenger: RootMessenger<
    PredictNextControllerActions,
    PredictNextControllerEvents
  >,
): PredictNextControllerMessenger =>
  new Messenger({
    namespace: 'PredictNextController',
    parent: rootMessenger,
  });

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
