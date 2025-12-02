import { BridgeControllerMessenger } from '@metamask/bridge-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param rootExtendedMessenger - The base controller messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): BridgeControllerMessenger {
  const messenger = new Messenger<
    'BridgeController',
    MessengerActions<BridgeControllerMessenger>,
    MessengerEvents<BridgeControllerMessenger>,
    RootMessenger
  >({
    namespace: 'BridgeController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:getAccountByAddress',
      'SnapController:handleRequest',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'TokenRatesController:getState',
      'MultichainAssetsRatesController:getState',
      'CurrencyRateController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

type BridgeControllerInitActions = 'AnalyticsController:trackEvent';

type BridgeControllerInitEvents = never;

export type BridgeControllerInitMessenger = ReturnType<
  typeof getBridgeControllerInitMessenger
>;

/**
 * Get the init messenger for the BridgeController. This is scoped to the
 * actions and events that the BridgeController is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The BridgeControllerInitMessenger.
 */
export function getBridgeControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'BridgeControllerInit',
    BridgeControllerInitActions,
    BridgeControllerInitEvents,
    RootMessenger
  >({
    namespace: 'BridgeControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AnalyticsController:trackEvent'],
    events: [],
    messenger,
  });
  return messenger;
}
