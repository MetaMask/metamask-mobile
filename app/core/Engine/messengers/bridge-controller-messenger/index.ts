import { BridgeControllerMessenger } from '@metamask/bridge-controller';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<BridgeControllerMessenger>,
    MessengerEvents<BridgeControllerMessenger>
  >,
): BridgeControllerMessenger {
  const messenger: BridgeControllerMessenger = new Messenger({
    namespace: 'BridgeController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getAccountByAddress',
      'SnapController:handleRequest',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'TokenRatesController:getState',
      'MultichainAssetsRatesController:getState',
      'CurrencyRateController:getState',
      'RemoteFeatureFlagController:getState',
      'AuthenticationController:getBearerToken',
      'AssetsController:getExchangeRatesForBridge',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

type BridgeControllerInitMessengerActions =
  | AnalyticsControllerActions
  | RemoteFeatureFlagControllerGetStateAction;

export type BridgeControllerInitMessenger = Messenger<
  'BridgeControllerInit',
  BridgeControllerInitMessengerActions,
  never
>;

/**
 * Get the BridgeControllerInitMessenger for the BridgeController.
 * This messenger is used during controller initialization to call other controllers.
 *
 * @param rootMessenger - The root messenger.
 * @returns The BridgeControllerInitMessenger.
 */
export function getBridgeControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<BridgeControllerInitMessenger>,
    MessengerEvents<BridgeControllerInitMessenger>
  >,
): BridgeControllerInitMessenger {
  const messenger: BridgeControllerInitMessenger = new Messenger({
    namespace: 'BridgeControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'AnalyticsController:trackEvent',
      'RemoteFeatureFlagController:getState',
    ],
    events: [],
    messenger,
  });

  return messenger;
}
