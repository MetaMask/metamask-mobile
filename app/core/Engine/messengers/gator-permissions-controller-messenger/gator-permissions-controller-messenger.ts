import type { GatorPermissionsControllerMessenger } from '@metamask/gator-permissions-controller';
import { BaseControllerMessenger } from '../../types';

export type { GatorPermissionsControllerMessenger };

export function getGatorPermissionsControllerMessenger(
  messenger: BaseControllerMessenger,
): GatorPermissionsControllerMessenger {
  return messenger.getRestricted({
    name: 'GatorPermissionsController',
    allowedActions: [],
    allowedEvents: [],
  });
}
