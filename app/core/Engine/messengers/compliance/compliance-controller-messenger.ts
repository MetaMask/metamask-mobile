import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ComplianceControllerMessenger } from '@metamask/compliance-controller';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type { RootMessenger } from '../../types';

/**
 * Get the messenger for the ComplianceController.
 *
 * Delegates ComplianceService actions so the controller can call
 * the service through the messenger.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ComplianceControllerMessenger.
 */
export function getComplianceControllerMessenger(
  rootMessenger: RootMessenger,
): ComplianceControllerMessenger {
  const messenger = new Messenger<
    'ComplianceController',
    MessengerActions<ComplianceControllerMessenger>,
    MessengerEvents<ComplianceControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ComplianceController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ComplianceService:checkWalletCompliance',
      'ComplianceService:checkWalletsCompliance',
      'ComplianceService:updateBlockedWallets',
    ],
    messenger,
  });
  return messenger;
}

export type ComplianceControllerInitMessenger = ReturnType<
  typeof getComplianceControllerInitMessenger
>;

/**
 * Get the init messenger for the ComplianceController.
 *
 * Provides access to RemoteFeatureFlagController state for feature flag checks.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ComplianceControllerInitMessenger.
 */
export function getComplianceControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'ComplianceControllerInit',
    RemoteFeatureFlagControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'ComplianceControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    messenger,
  });
  return messenger;
}
