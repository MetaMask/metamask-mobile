import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { PreferencesControllerMessenger } from '@metamask/preferences-controller';
import { RootMessenger } from '../types';

export function getPreferencesControllerMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'PreferencesController',
    MessengerActions<PreferencesControllerMessenger>,
    MessengerEvents<PreferencesControllerMessenger>,
    RootMessenger
  >({
    namespace: 'PreferencesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: ['KeyringController:stateChange'],
    messenger,
  });
  return messenger;
}
