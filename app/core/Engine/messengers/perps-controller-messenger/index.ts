import { PerpsControllerMessenger } from '@metamask/perps-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the PerpsControllerMessenger for the PerpsController.
 *
 * PerpsController uses the messenger for all cross-controller communication:
 * NetworkController, KeyringController, TransactionController,
 * RemoteFeatureFlagController, AccountsController, AccountTreeController,
 * AuthenticationController, AuthenticatedUserStorageService.
 * The root messenger already registers actions for these controllers,
 * so the child messenger can call them through the parent.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The PerpsControllerMessenger.
 */
export function getPerpsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): PerpsControllerMessenger {
  const messenger = new Messenger<
    'PerpsController',
    MessengerActions<PerpsControllerMessenger>,
    MessengerEvents<PerpsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'PerpsController',
    parent: rootExtendedMessenger,
  });
  // TS2590: The union of PerpsControllerAllowedActions & GlobalActions exceeds
  // TypeScript's complexity limit. The delegate call is correct at runtime;
  // suppress the compiler error rather than weakening the types.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error TS2590
  rootExtendedMessenger.delegate({
    actions: [
      'GeolocationController:getGeolocation',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'KeyringController:getState',
      'KeyringController:signTypedMessage',
      'TransactionController:addTransaction',
      'RemoteFeatureFlagController:getState',
      'AccountsController:getSelectedAccount',
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      'AuthenticationController:getBearerToken',
      'AuthenticatedUserStorageService:getNotificationPreferences',
      'AuthenticatedUserStorageService:putNotificationPreferences',
    ],
    events: [
      'RemoteFeatureFlagController:stateChange',
      'AccountsController:selectedAccountChange',
      'AccountTreeController:selectedAccountGroupChange',
    ],
    messenger,
  });
  return messenger;
}
