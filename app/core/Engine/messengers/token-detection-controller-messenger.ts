import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import {
  AssetsContractControllerGetBalancesInSingleCallAction,
  TokenDetectionControllerMessenger,
} from '@metamask/assets-controllers';
import { RootMessenger } from '../types';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';

/**
 * Get the messenger for the token detection controller. This is scoped to the
 * token detection controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenDetectionControllerMessenger.
 */
export function getTokenDetectionControllerMessenger(
  rootMessenger: RootMessenger,
): TokenDetectionControllerMessenger {
  const messenger = new Messenger<
    'TokenDetectionController',
    MessengerActions<TokenDetectionControllerMessenger>,
    MessengerEvents<TokenDetectionControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TokenDetectionController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getNetworkClientById',
      'NetworkController:getNetworkConfigurationByNetworkClientId',
      'NetworkController:getState',
      'KeyringController:getState',
      'PreferencesController:getState',
      'TokenListController:getState',
      'TokensController:getState',
      'TokensController:addDetectedTokens',
      'AccountsController:getAccount',
      'TokensController:addTokens',
      'NetworkController:findNetworkClientIdByChainId',
      'AuthenticationController:getBearerToken',
    ],
    events: [
      'KeyringController:lock',
      'KeyringController:unlock',
      'PreferencesController:stateChange',
      'NetworkController:networkDidChange',
      'TokenListController:stateChange',
      'AccountsController:selectedEvmAccountChange',
      'TransactionController:transactionConfirmed',
    ],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions =
  | AssetsContractControllerGetBalancesInSingleCallAction
  | AnalyticsControllerActions;

type AllowedInitializationEvents = never;

export type TokenDetectionControllerInitMessenger = ReturnType<
  typeof getTokenDetectionControllerInitMessenger
>;

/**
 * Get the messenger for the token detection controller initialization. This is scoped to the
 * actions and events that the token detection controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenDetectionControllerInitMessenger.
 */
export function getTokenDetectionControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'TokenDetectionControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'TokenDetectionControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AssetsContractController:getBalancesInSingleCall',
      'AnalyticsController:trackEvent',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
