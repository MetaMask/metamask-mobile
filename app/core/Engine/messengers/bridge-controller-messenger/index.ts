import { BridgeControllerMessenger } from '@metamask/bridge-controller';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';
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

type BridgeControllerInitMessengerActions = AnalyticsControllerActions;

/**
 * Get the BridgeControllerInitMessenger for the BridgeController.
 * This messenger is used during controller initialization to call other controllers.
 *
 * @param rootMessenger - The root messenger.
 * @returns The BridgeControllerInitMessenger.
 */
export type BridgeControllerInitMessenger = ReturnType<
  typeof getBridgeControllerInitMessenger
>;

export function getBridgeControllerInitMessenger(
  rootMessenger: RootMessenger,
): Messenger<
  'BridgeControllerInit',
  BridgeControllerInitMessengerActions,
  never,
  RootMessenger
> {
  const messenger = new Messenger<
    'BridgeControllerInit',
    BridgeControllerInitMessengerActions,
    never,
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
