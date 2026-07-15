import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { PreferencesControllerMessenger } from '@metamask/preferences-controller';
import { RootMessenger } from '../types';

export function getPreferencesControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<PreferencesControllerMessenger>,
    MessengerEvents<PreferencesControllerMessenger>
  >,
): PreferencesControllerMessenger {
  const messenger: PreferencesControllerMessenger = new Messenger({
    namespace: 'PreferencesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: [],
    messenger,
  });
  return messenger;
}
