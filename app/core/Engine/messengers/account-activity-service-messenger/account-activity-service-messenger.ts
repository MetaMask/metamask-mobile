import {
  type AccountActivityServiceMessenger,
  ACCOUNT_ACTIVITY_SERVICE_ALLOWED_ACTIONS,
  ACCOUNT_ACTIVITY_SERVICE_ALLOWED_EVENTS,
} from '@metamask/backend-platform';
import type { BaseControllerMessenger } from '../../types';

/**
 * Get the messenger for the AccountActivityService.
 *
 * @param baseMessenger - The base controller messenger.
 * @returns The restricted messenger for the AccountActivityService.
 */
export function getAccountActivityServiceMessenger(
  baseMessenger: BaseControllerMessenger,
): AccountActivityServiceMessenger {
  return baseMessenger.getRestricted({
    name: 'AccountActivityService',
    allowedActions: [...ACCOUNT_ACTIVITY_SERVICE_ALLOWED_ACTIONS],
    allowedEvents: [...ACCOUNT_ACTIVITY_SERVICE_ALLOWED_EVENTS],
  });
}
