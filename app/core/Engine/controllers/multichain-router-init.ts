import { ControllerInitFunction } from '../types';
import {
  MultichainRouter,
  type MultichainRouterMessenger,
} from '@metamask/snaps-controllers';
import { MultichainRouterInitMessenger } from '../messengers/multichain-router-messenger';
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import { KeyringTypes } from '@metamask/keyring-controller';

/**
 * Initialize the multichain router.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const multichainRouterInit: ControllerInitFunction<
  MultichainRouter,
  MultichainRouterMessenger,
  MultichainRouterInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const getSnapKeyring = async (): Promise<SnapKeyring> => {
    // TODO: Replace `getKeyringsByType` with `withKeyring`
    let [snapKeyring] = initMessenger.call(
      'KeyringController:getKeyringsByType',
      KeyringTypes.snap,
    );

    if (!snapKeyring) {
      await initMessenger.call(
        'KeyringController:addNewKeyring',
        KeyringTypes.snap,
      );

      // TODO: Replace `getKeyringsByType` with `withKeyring`
      [snapKeyring] = initMessenger.call(
        'KeyringController:getKeyringsByType',
        KeyringTypes.snap,
      );
    }
    return snapKeyring as SnapKeyring;
  };

  // This fixes an issue where `withKeyring` would lock the `KeyringController`
  // mutex. That meant that if a snap requested a keyring operation (like
  // requesting entropy) while the `KeyringController` was locked, it would
  // cause a deadlock. This is a temporary fix until we can refactor how we
  // handle requests to the Snaps Keyring.
  const withSnapKeyring = async (
    operation: ({ keyring }: { keyring: unknown }) => void,
  ) => {
    const keyring = await getSnapKeyring();
    return operation({ keyring });
  };

  const controller = new MultichainRouter({
    messenger: controllerMessenger,

    // @ts-expect-error: Type for `withSnapKeyring` is different.
    withSnapKeyring,
  });

  return {
    controller,
  };
};
