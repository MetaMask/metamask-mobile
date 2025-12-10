import { CardError, CardErrorType } from '../types';

/**
 * Checks if an error is an authentication error that requires the user to re-authenticate
 * @param error The error to check
 * @returns True if the error is an authentication error, false otherwise
 */
export const isAuthenticationError = (error: unknown): boolean => {
  if (error instanceof CardError) {
    return error.type === CardErrorType.INVALID_CREDENTIALS;
  }

  // Check if error message indicates authentication failure
  if (error instanceof Error) {
    const lowerCaseMessage = error.message.toLowerCase();
    return (
      lowerCaseMessage.includes('unauthorized') ||
      lowerCaseMessage.includes('invalid credentials') ||
      lowerCaseMessage.includes('authentication failed') ||
      (lowerCaseMessage.includes('token') &&
        (lowerCaseMessage.includes('expired') ||
          lowerCaseMessage.includes('invalid')))
    );
  }

  return false;
};
