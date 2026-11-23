import Engine from './Engine';
import Logger from '../util/Logger';

/**
 * Ends the Card session after the wallet password changes.
 * A failed sign-out must not fail the password change itself.
 */
export async function signOutCardAfterPasswordChange(): Promise<void> {
  try {
    await Engine.context.CardController.logout();
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to sign out of Card after a password change',
    );
  }
}
