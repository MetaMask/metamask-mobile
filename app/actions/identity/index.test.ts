import {
  performSignIn,
  performSignOut,
  disableProfileSyncing,
  enableProfileSyncing,
  syncInternalAccountsWithUserStorage,
} from '.';
import Engine from '../../core/Engine';

jest.mock('../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    AuthenticationController: {
      performSignIn: jest.fn(),
      performSignOut: jest.fn(),
    },
    UserStorageController: {
      enableProfileSyncing: jest.fn(),
      disableProfileSyncing: jest.fn(),
      syncInternalAccountsWithUserStorage: jest.fn(),
    },
  },
}));

describe('Identity actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in successfully', async () => {
    (
      Engine.context.AuthenticationController.performSignIn as jest.Mock
    ).mockResolvedValue('valid-access-token');

    await performSignIn();

    expect(
      Engine.context.AuthenticationController.performSignIn,
    ).toHaveBeenCalled();
  });

  it('signs out successfully', () => {
    (
      Engine.context.AuthenticationController.performSignOut as jest.Mock
    ).mockResolvedValue(undefined);

    const result = performSignOut();

    expect(
      Engine.context.AuthenticationController.performSignOut,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('enables profile syncing successfully', async () => {
    (
      Engine.context.UserStorageController.enableProfileSyncing as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await enableProfileSyncing();

    expect(
      Engine.context.UserStorageController.enableProfileSyncing,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('disables profile syncing successfully', async () => {
    (
      Engine.context.UserStorageController.disableProfileSyncing as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await disableProfileSyncing();

    expect(
      Engine.context.UserStorageController.disableProfileSyncing,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('syncs internal accounts with user storage', async () => {
    (
      Engine.context.UserStorageController
        .syncInternalAccountsWithUserStorage as jest.Mock
    ).mockResolvedValue(undefined);

    const result = await syncInternalAccountsWithUserStorage();

    expect(
      Engine.context.UserStorageController.syncInternalAccountsWithUserStorage,
    ).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
