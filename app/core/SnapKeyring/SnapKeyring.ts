import { SnapKeyring } from '@metamask/eth-snap-keyring';
import type { SnapController } from '@metamask/snaps-controllers';
import { SnapKeyringBuilderMessenger } from './types';
import type { SnapId } from '@metamask/snaps-sdk';
import Logger from '../../util/Logger';

/**
 * Get the addresses of the accounts managed by a given Snap.
 *
 * @param controller - Instance of the MetaMask Controller.
 * @param snapId - Snap ID to get accounts for.
 * @returns The addresses of the accounts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAccountsBySnapId = async (engine: any, snapId: SnapId) => {
  const snapKeyring: SnapKeyring = await engine.getSnapKeyring();
  return await snapKeyring.getAccountsBySnapId(snapId);
};

/**
 * Constructs a SnapKeyring builder with specified handlers for managing snap accounts.
 * - Here is the equivalent function on the extension: https://github.com/MetaMask/metamask-extension/blob/develop/app/scripts/lib/snap-keyring/snap-keyring.ts#L111
 *
 * @param controllerMessenger - The controller messenger instance.
 * @param getSnapController - A function that retrieves the Snap Controller instance.
 * @param persistKeyringHelper - A function that persists all keyrings in the vault.
 * @param removeAccountHelper - A function to help remove an account based on its address.
 * @returns The constructed SnapKeyring builder instance with the following methods:
 * - `saveState`: Persists all keyrings in the keyring controller.
 * - `addAccount`: Initiates the process of adding an account with user confirmation and handling the user input.
 * - `removeAccount`: Initiates the process of removing an account with user confirmation and handling the user input.
 * - `redirectUser`: Redirects the user to a specified URL with a message to complete signing. This method is used to handle asynchronous signing requests.
 * - `addressExists`: Returns a boolean indicating if an address exists in the keyring.
 */
export const snapKeyringBuilder = (
  controllerMessenger: SnapKeyringBuilderMessenger,
  getSnapController: () => SnapController,
  persistKeyringHelper: () => Promise<void>,
  removeAccountHelper: (address: string) => Promise<unknown>,
): { (): SnapKeyring; type: string } => {
  const builder = () => new SnapKeyring(getSnapController(), {
    addressExists: async (address) =>
      (
        await controllerMessenger.call('KeyringController:getAccounts')
      ).includes(address.toLowerCase()),

    redirectUser: async (snapId: string, url: string, message: string) => {
      Logger.log(
        `SnapKeyring: redirectUser called with \n
        - snapId: ${snapId} \n
        - url: ${url} \n
        - message: ${message} \n`,
      );
    },

    saveState: async () => {
      await persistKeyringHelper();
    },

    addAccount: async (
      address: string,
      snapId: string,
      handleUserInput: (accepted: boolean) => Promise<void>,
      accountNameSuggestion = '',
      displayConfirmation = false,
    ) => {
      Logger.log(
        `SnapKeyring: addAccount called with \n
        - address: ${address} \n
        - handleUserInput: ${handleUserInput} \n
        - snapId: ${snapId} \n
        - accountNameSuggestion: ${accountNameSuggestion} \n
        - displayConfirmation: ${displayConfirmation}`,
      );

      //approve everything for now because we have not implemented snap account confirmations yet
      await handleUserInput(true);
      await persistKeyringHelper();
      const account = controllerMessenger.call(
        'AccountsController:getAccountByAddress',
        address,
      );
      if (!account) {
        throw new Error(
          `Internal account not found for address: ${address}`,
        );
      }

      // Set the selected account to the new account
      controllerMessenger.call(
        'AccountsController:setSelectedAccount',
        account.id,
      );
    },

    removeAccount: async (
      address: string,
      snapId: string,
      handleUserInput: (accepted: boolean) => Promise<void>,
    ) => {
      Logger.log(
        `SnapKeyring: removeAccount called with \n
        - address: ${address} \n
        - handleUserInput: ${handleUserInput} \n
        - snapId: ${snapId} \n`,
      );
      // approve everything for now because we have not implemented snap account confirmations yet
      await removeAccountHelper(address);
      await handleUserInput(true);
      await persistKeyringHelper();
    },
  });
  builder.type = SnapKeyring.type;
  return builder;
};
