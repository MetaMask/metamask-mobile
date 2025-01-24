import { getErrorMessage } from '@metamask/utils';
import Engine from '../../core/Engine';
import identityErrors from './constants/errors';

export const performSignIn = async () => {
  try {
    const accessToken =
      await Engine.context.AuthenticationController.performSignIn();
    if (!accessToken) {
      return getErrorMessage(identityErrors.PERFORM_SIGN_IN);
    }

    const profile =
      await Engine.context.AuthenticationController.getSessionProfile();
    if (!profile) {
      return getErrorMessage(identityErrors.PERFORM_SIGN_IN);
    }
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const performSignOut = async () => {
  try {
    await Engine.context.AuthenticationController.performSignOut();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const enableProfileSyncing = async () => {
  try {
    await Engine.context.UserStorageController.enableProfileSyncing();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const disableProfileSyncing = async () => {
  try {
    await Engine.context.UserStorageController.disableProfileSyncing();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const syncInternalAccountsWithUserStorage = async () => {
  try {
    await Engine.context.UserStorageController.syncInternalAccountsWithUserStorage();
  } catch (error) {
    return getErrorMessage(error);
  }
};
