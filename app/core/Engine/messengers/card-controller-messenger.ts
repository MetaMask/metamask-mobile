import { BaseControllerMessenger, BaseRestrictedControllerMessenger } from '../types';

/**
 * Get the messenger for the CardController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The messenger for the TokenSearchDiscoveryController.
 */
export function getCardControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): BaseRestrictedControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'CardController',
    allowedActions: ['CardController:isCardHolder'],
    allowedEvents: [],
  });
} 