import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { UiSlotsControllerMessenger } from '../../controllers/ui-slots-controller/types';
import type { RootMessenger } from '../../types';

export function getUiSlotsControllerMessenger(
  rootMessenger: RootMessenger,
): UiSlotsControllerMessenger {
  const messenger = new Messenger<
    'UiSlotsController',
    MessengerActions<UiSlotsControllerMessenger>,
    MessengerEvents<UiSlotsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'UiSlotsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      'UiSlotsDataService:getScreen',
      'RemoteFeatureFlagController:getState',
    ],
    events: ['RemoteFeatureFlagController:stateChange'],
  });

  return messenger;
}
