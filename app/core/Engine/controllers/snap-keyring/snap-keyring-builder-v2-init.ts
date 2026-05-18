import type { MessengerClientInitFunction } from '../../types';
import {
  snapKeyringBuilderV2,
  type SnapKeyringBuilderV2,
  type SnapKeyringBuilderV2Messenger,
} from '../../../SnapKeyring/SnapKeyringV2';
import type { SnapKeyringBuilderV2InitMessenger } from '../../messengers/snap-keyring-builder-v2-messenger';

/**
 * Initialize the v2 Snap keyring builder.
 *
 * @param request - The request object.
 * @returns The initialized builder.
 */
export const snapKeyringBuilderV2Init: MessengerClientInitFunction<
  SnapKeyringBuilderV2,
  SnapKeyringBuilderV2Messenger,
  SnapKeyringBuilderV2InitMessenger
> = ({ controllerMessenger, initMessenger, removeAccount }) => {
  const controller = snapKeyringBuilderV2(controllerMessenger, {
    persistKeyringHelper: async () => {
      await initMessenger.call('KeyringController:persistAllKeyrings');
      await initMessenger.call('AccountsController:updateAccounts');
    },
    removeAccountHelper: (address) => removeAccount(address),
  });

  return { controller };
};
