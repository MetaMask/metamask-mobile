import {
  CurrencyRateControllerGetStateAction,
  DeFiPositionsControllerV2Messenger,
} from '@metamask/assets-controllers';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AuthenticationController } from '@metamask/profile-sync-controller';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../../types';

/**
 * Get a restricted messenger for the DeFiPositionsControllerV2.
 *
 * @param rootMessenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getDeFiPositionsControllerV2Messenger(
  rootMessenger: RootMessenger,
): DeFiPositionsControllerV2Messenger {
  const messenger = new Messenger<
    'DeFiPositionsControllerV2',
    MessengerActions<DeFiPositionsControllerV2Messenger>,
    MessengerEvents<DeFiPositionsControllerV2Messenger>,
    RootMessenger
  >({
    namespace: 'DeFiPositionsControllerV2',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AccountTreeController:getAccountsFromSelectedAccountGroup'],
    messenger,
  });
  return messenger;
}

type DeFiPositionsControllerV2InitMessengerActions =
  | RemoteFeatureFlagControllerGetStateAction
  | CurrencyRateControllerGetStateAction
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction;

export type DeFiPositionsControllerV2InitMessenger = ReturnType<
  typeof getDeFiPositionsControllerV2InitMessenger
>;

/**
 * Get a restricted messenger for DeFiPositionsControllerV2 initialization.
 *
 * @param rootMessenger - The messenger to restrict.
 * @returns The restricted init messenger.
 */
export function getDeFiPositionsControllerV2InitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'DeFiPositionsControllerV2Init',
    DeFiPositionsControllerV2InitMessengerActions,
    never,
    RootMessenger
  >({
    namespace: 'DeFiPositionsControllerV2Init',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'RemoteFeatureFlagController:getState',
      'CurrencyRateController:getState',
      'AuthenticationController:getBearerToken',
    ],
    messenger,
  });
  return messenger;
}
