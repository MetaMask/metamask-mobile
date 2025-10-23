import type { GatorPermissionsControllerMessenger } from '@metamask/gator-permissions-controller';
import { RootExtendedMessenger } from '../../types';

export type { GatorPermissionsControllerMessenger };

export function getGatorPermissionsControllerMessenger(
  messenger: RootExtendedMessenger,
): GatorPermissionsControllerMessenger {
  return messenger.getRestricted({
    name: 'GatorPermissionsController',
    allowedActions: [],
    allowedEvents: [],
  });
}
