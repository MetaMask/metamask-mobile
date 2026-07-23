import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type { RootMessenger } from '../../types';
import type { StellarAssetsControllerMessenger } from '../../controllers/stellar-assets-controller/stellar-assets-controller';

/**
 * Get a restricted messenger for the Stellar Assets controller.
 *
 * @param rootMessenger - The root messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getStellarAssetsControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<StellarAssetsControllerMessenger>,
    MessengerEvents<StellarAssetsControllerMessenger>
  >,
): StellarAssetsControllerMessenger {
  const messenger: StellarAssetsControllerMessenger = new Messenger({
    namespace: 'StellarAssetsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    events: [
      'AccountsController:accountRemoved',
      'AccountsController:accountAssetListUpdated',
    ],
    actions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'KeyringController:getState',
    ],
  });

  return messenger;
}

type AllowedInitializationActions = RemoteFeatureFlagControllerGetStateAction;

export type StellarAssetsControllerInitMessenger = Messenger<
  'StellarAssetsControllerInit',
  AllowedInitializationActions,
  never
>;

/**
 * Get a restricted init messenger for the Stellar Assets controller.
 *
 * @param rootMessenger - The root messenger to restrict.
 * @returns The restricted init messenger.
 */
export function getStellarAssetsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<StellarAssetsControllerInitMessenger>,
    MessengerEvents<StellarAssetsControllerInitMessenger>
  >,
): StellarAssetsControllerInitMessenger {
  const messenger: StellarAssetsControllerInitMessenger = new Messenger({
    namespace: 'StellarAssetsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: ['RemoteFeatureFlagController:getState'],
  });

  return messenger;
}
