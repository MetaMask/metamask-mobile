import type { NetworkEnablementControllerMessenger } from '@metamask/network-enablement-controller';
import type { RootExtendedMessenger } from '../../types';

/**
 * Get the messenger for the NetworkEnablementController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The restricted messenger for the NetworkEnablementController.
 */
export const getNetworkEnablementControllerMessenger = (
  baseControllerMessenger: RootExtendedMessenger,
): NetworkEnablementControllerMessenger =>
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
      'TransactionController:transactionSubmitted',
    ],
  });
