import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../RPCMethods/RPCMethodMiddleware';
import { SnapKeyringBuilderMessenger } from '../types';

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
