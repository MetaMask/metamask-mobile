import { ControllerInitFunction } from '../types';
import { SnapKeyringBuilderInitMessenger } from '../messengers/snap-keyring-builder-messenger';
import {
  snapKeyringBuilder,
  SnapKeyringBuilder,
} from '../../SnapKeyring/SnapKeyring';
import { SnapKeyringBuilderMessenger } from '../../SnapKeyring/types';

/**
 * Initialize the Snap keyring builder.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const snapKeyringBuilderInit: ControllerInitFunction<
  SnapKeyringBuilder,
  SnapKeyringBuilderMessenger,
  SnapKeyringBuilderInitMessenger
> = ({ controllerMessenger, initMessenger, removeAccount }) => {
  const controller = snapKeyringBuilder(controllerMessenger, {
    persistKeyringHelper: async () => {
      // Necessary to only persist the keyrings, the `AccountsController` will
      // automatically react to `KeyringController:stateChange`.
      await initMessenger.call('KeyringController:persistAllKeyrings');
    },
    removeAccountHelper: (address) => removeAccount(address),
  });

  return {
    persistedStateKey: null,
    memStateKey: null,
    controller,
  };
};
