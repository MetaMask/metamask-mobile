import { getErrorMessage } from '@metamask/utils';
import Engine from '../../core/Engine';

export const performSignIn = async () => {
  try {
    await Engine.context.AuthenticationController.performSignIn();
  } catch (error) {
    return getErrorMessage(error);
  }
};

export const performSignOut = () => {
  try {
    Engine.context.AuthenticationController.performSignOut();
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
