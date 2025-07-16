import { BaseControllerMessenger } from '../../types';
import { PreferencesControllerMessenger } from '@metamask/preferences-controller';

// Export the types
export * from './types';

/**
 * Get the PreferencesControllerMessenger for the PreferencesController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The PreferencesControllerMessenger.
 */
export function getPreferencesControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): PreferencesControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'PreferencesController',
    allowedEvents: [],
    allowedActions: [],
  });
}
