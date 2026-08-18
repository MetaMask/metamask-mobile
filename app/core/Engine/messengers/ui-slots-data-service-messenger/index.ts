import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { UiSlotsDataServiceMessenger } from '../../controllers/ui-slots-controller/UiSlotsDataService';
import type { RootMessenger } from '../../types';

export function getUiSlotsDataServiceMessenger(
  rootMessenger: RootMessenger,
): UiSlotsDataServiceMessenger {
  return new Messenger<
    'UiSlotsDataService',
    MessengerActions<UiSlotsDataServiceMessenger>,
    MessengerEvents<UiSlotsDataServiceMessenger>,
    RootMessenger
  >({
    namespace: 'UiSlotsDataService',
    parent: rootMessenger,
  });
}
