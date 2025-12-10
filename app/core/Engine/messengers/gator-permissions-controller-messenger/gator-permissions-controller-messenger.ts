import type { GatorPermissionsControllerMessenger } from '@metamask/gator-permissions-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

export type { GatorPermissionsControllerMessenger };

export function getGatorPermissionsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): GatorPermissionsControllerMessenger {
  const messenger = new Messenger<
    'GatorPermissionsController',
    MessengerActions<GatorPermissionsControllerMessenger>,
    MessengerEvents<GatorPermissionsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'GatorPermissionsController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
