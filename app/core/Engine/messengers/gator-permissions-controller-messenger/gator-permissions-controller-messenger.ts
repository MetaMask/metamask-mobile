import type { GatorPermissionsControllerMessenger } from '@metamask/gator-permissions-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';

export function getGatorPermissionsControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<GatorPermissionsControllerMessenger>,
    MessengerEvents<GatorPermissionsControllerMessenger>
  >,
): GatorPermissionsControllerMessenger {
  const messenger: GatorPermissionsControllerMessenger = new Messenger({
    namespace: 'GatorPermissionsController',
    parent: rootMessenger,
  });
  return messenger;
}
