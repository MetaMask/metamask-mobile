import type { NetworkEnablementControllerMessenger } from '@metamask/network-enablement-controller';
import type { BaseControllerMessenger } from '../../types';

/**
 * Get the messenger for the NetworkEnablementController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The restricted messenger for the NetworkEnablementController.
 */
export const getNetworkEnablementControllerMessenger = (
  baseControllerMessenger: BaseControllerMessenger,
): NetworkEnablementControllerMessenger =>
  // @ts-expect-error - TODO: fix this mismatch type between the controller messenger and the base restricted controller messenger
  baseControllerMessenger.getRestricted({
    name: 'NetworkEnablementController',
    allowedActions: [
      'NetworkController:getState',
      'MultichainNetworkController:getState',
    ],
    allowedEvents: [
      'NetworkController:networkAdded',
      'NetworkController:networkRemoved',
      'NetworkController:stateChange',
    ],
  });
