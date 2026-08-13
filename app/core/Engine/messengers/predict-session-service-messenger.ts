import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { PredictSessionServiceMessenger } from '../../../components/UI/PredictNext/services/PredictSessionService';
import type { RootMessenger } from '../types';

export const getPredictSessionServiceMessenger = (
  rootMessenger: RootMessenger,
): PredictSessionServiceMessenger => {
  const messenger = new Messenger<
    'PredictSessionService',
    MessengerActions<PredictSessionServiceMessenger>,
    MessengerEvents<PredictSessionServiceMessenger>,
    RootMessenger
  >({
    namespace: 'PredictSessionService',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: ['AuthenticationController:getBearerToken'],
    events: ['AuthenticationController:stateChange', 'KeyringController:lock'],
  });

  return messenger;
};
