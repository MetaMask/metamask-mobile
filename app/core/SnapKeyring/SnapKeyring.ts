import { SnapKeyring } from '@metamask/eth-snap-keyring';
import type { SnapController } from '@metamask/snaps-controllers';
import { SnapKeyringBuilderMessenger } from './types';
import Logger from '../../util/Logger';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../RPCMethods/RPCMethodMiddleware';
import { IconName } from '../../component-library/components/Icons/Icon';
import { showError, showSuccess } from './utils/showResult';
import { strings } from '../../../locales/i18n';

interface CreateAccountConfirmationResult {
  success: boolean;
  name?: string;
}

/**
 * Show the account name suggestion confirmation dialog for a given Snap.
 *
 * @param snapId - Snap ID to show the account name suggestion dialog for.
 * @param controllerMessenger - The controller messenger instance.
 * @param accountNameSuggestion - Suggested name for the new account.
 * @returns The user's confirmation result.
 */
export async function showAccountNameSuggestionDialog(
  snapId: string,
  controllerMessenger: SnapKeyringBuilderMessenger,
  accountNameSuggestion: string,
): Promise<CreateAccountConfirmationResult> {
  try {
    const confirmationResult = (await controllerMessenger.call(
      'ApprovalController:addRequest',
      {
        origin: snapId,
        type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
        requestData: {
          snapSuggestedAccountName: accountNameSuggestion,
        },
      },
      true,
    )) as CreateAccountConfirmationResult;

    if (confirmationResult) {
      return {
        success: confirmationResult.success,
        name: confirmationResult.name,
      };
    }
    return { success: false };
  } catch (e) {
    throw new Error(`Error occurred while showing name account dialog.\n${e}`);
  }
}

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
  const builder = () =>
    new SnapKeyring(getSnapController(), {
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
        _displayConfirmation = false,
      ) => {
        const learnMoreLink =
          'https://support.metamask.io/managing-my-wallet/accounts-and-addresses/how-to-add-accounts-in-your-wallet/';
        const { id: addAccountFlowId } = controllerMessenger.call(
          'ApprovalController:startFlow',
        );

        try {
          const accountNameConfirmationResult =
            await showAccountNameSuggestionDialog(
              snapId,
              controllerMessenger,
              accountNameSuggestion,
            );

          if (accountNameConfirmationResult.success) {
            try {
              await persistKeyringHelper();
              await handleUserInput(accountNameConfirmationResult.success);
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

              if (accountNameConfirmationResult.name) {
                controllerMessenger.call(
                  'AccountsController:setAccountName',
                  account.id,
                  accountNameConfirmationResult.name,
                );
              }
              await showSuccess(
                controllerMessenger,
                snapId,
                {
                  icon: IconName.UserCircleAdd,
                  title: strings('snap_keyring.snap_account_created'),
                },
                {
                  message: strings(
                    'snap_keyring.snap_account_created_description',
                  ),
                  address,
                  learnMoreLink,
                },
              );
            } catch (e) {
              // Error occurred while naming the account
              const error = (e as Error).message;

              await showError(
                controllerMessenger,
                snapId,
                {
                  icon: IconName.UserCircleAdd,
                  title: strings('snap_keyring.snap_account_creation_failed'),
                },
                {
                  message: strings(
                    'snap_keyring.snap_account_creation_failed_description',
                    { snapName: snapId },
                  ),
                  learnMoreLink,
                  error,
                },
              );
              throw new Error(
                `Error occurred while creating snap account: ${error}`,
              );
            }
          } else {
            // User has cancelled account creation so remove the account from the keyring
            await handleUserInput(accountNameConfirmationResult?.success);

            throw new Error('User denied account creation');
          }
        } finally {
          controllerMessenger.call('ApprovalController:endFlow', {
            id: addAccountFlowId,
          });
        }
      },

      removeAccount: async (
        address: string,
        snapId: string,
        handleUserInput: (accepted: boolean) => Promise<void>,
      ) => {
        // TODO: Implement proper snap account confirmations. Currently, we are approving everything for testing purposes.
        Logger.log(
          `SnapKeyring: removeAccount called with \n
        - address: ${address} \n
        - handleUserInput: ${handleUserInput} \n
        - snapId: ${snapId} \n`,
        );
        // Approve everything for now because we have not implemented snap account confirmations yet
        await handleUserInput(true);
        await removeAccountHelper(address);
        await persistKeyringHelper();
      },
    });
  builder.type = SnapKeyring.type;
  return builder;
};
