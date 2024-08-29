/* eslint-disable no-console */
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import type { SnapController } from '@metamask/snaps-controllers';
import { SnapKeyringBuilderMessenger } from './types';
import type { SnapId } from '@metamask/snaps-sdk';

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
 *
 * @param controllerMessenger - The controller messenger instance.
 * @param getSnapController - A function that retrieves the Snap Controller instance.
 * @param persistKeyringHelper - A function that persists all keyrings in the vault.
 * @param removeAccountHelper - A function to help remove an account based on its address.
 * @returns The constructed SnapKeyring builder instance with the following methods:
 * - `saveState`: Persists all keyrings in the keyring controller.
 * - `addAccount`: Initiates the process of adding an account with user confirmation and handling the user input.
 * - `removeAccount`: Initiates the process of removing an account with user confirmation and handling the user input.
 */
export const snapKeyringBuilder = (
  controllerMessenger: SnapKeyringBuilderMessenger,
  getSnapController: () => SnapController,
  persistKeyringHelper: () => Promise<void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeAccountHelper: (address: string) => Promise<any>,
) => {
  const builder = (() =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new SnapKeyring(getSnapController() as any, {
      addressExists: async (address) =>
        (
          await controllerMessenger.call('KeyringController:getAccounts')
        ).includes(address.toLowerCase()),

      redirectUser: async (snapId: string, url: string, message: string) => {
        console.log(
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
        console.log(
          `SnapKeyring: addAccount called with \n
          - address: ${address} \n
          - handleUserInput: ${handleUserInput} \n
          - snapId: ${snapId} \n
          - accountNameSuggestion: ${accountNameSuggestion} \n
          - displayConfirmation: ${displayConfirmation}`,
        );

        // approve everything for now
        await handleUserInput(true);
        await persistKeyringHelper();
      },

      removeAccount: async (
        address: string,
        snapId: string,
        handleUserInput: (accepted: boolean) => Promise<void>,
      ) => {
        console.log(
          `SnapKeyring: removeAccount called with \n
          - address: ${address} \n
          - handleUserInput: ${handleUserInput} \n
          - snapId: ${snapId} \n`,
        );
        // approve everything for now
        await removeAccountHelper(address);
        await handleUserInput(true);
        await persistKeyringHelper();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;
  builder.type = SnapKeyring.type;
  return builder;
};
