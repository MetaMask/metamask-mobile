import {
  UserStorageControllerMessenger,
  UserStorageControllerState,
  Controller as UserStorageController,
  defaultState,
} from '@metamask/profile-sync-controller/user-storage';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { createUserStorageController } from './create-user-storage-controller';

jest.mock('@metamask/profile-sync-controller/user-storage');

describe('UserStorage Controller', () => {
  beforeEach(() => jest.resetAllMocks());

  const arrange = () => {
    const globalMessenger = new ExtendedControllerMessenger();
    const messenger: UserStorageControllerMessenger =
      globalMessenger.getRestricted({
        name: 'UserStorageController',
        allowedActions: [
          // Keyring Controller Requests
          'KeyringController:getState',
          'KeyringController:withKeyring',
          // Snap Controller Requests
          'SnapController:handleRequest',
          // Auth Controller Requests
          'AuthenticationController:getBearerToken',
          'AuthenticationController:getSessionProfile',
          'AuthenticationController:isSignedIn',
          'AuthenticationController:performSignIn',
          // Accounts Controller Requests
          'AccountsController:listAccounts',
          'AccountsController:updateAccountMetadata',
          // Network Controller Requests
          'NetworkController:getState',
          'NetworkController:addNetwork',
          'NetworkController:removeNetwork',
          'NetworkController:updateNetwork',
        ],
        allowedEvents: [
          // Keyring Controller Events
          'KeyringController:lock',
          'KeyringController:unlock',
          // Accounts Controller Events
          'AccountsController:accountAdded',
          'AccountsController:accountRenamed',
          // Network Controller Events
          'NetworkController:networkRemoved',
        ],
      });

    const mockConstructor = jest.spyOn(
      UserStorageController.prototype,
      // @ts-expect-error - this is not something you should be able to call, but this is a mock
      'constructor',
    );

    const assertGetConstructorCall = () =>
      mockConstructor.mock.calls[0][0] as unknown as {
        state: UserStorageControllerState;
      };

    return {
      globalMessenger,
      messenger,
      mockConstructor,
      assertGetConstructorCall,
    };
  };

  it('returns controller instance', () => {
    const { messenger } = arrange();
    const controller = createUserStorageController({
      messenger,
    });
    expect(controller).toBeInstanceOf(UserStorageController);
  });

  it('can pass undefined as initial state', () => {
    const { messenger, assertGetConstructorCall } = arrange();
    createUserStorageController({ messenger });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toBe(undefined);
  });

  it('uses initial state that is provided', () => {
    const { messenger, assertGetConstructorCall } = arrange();
    const state = { ...defaultState, isAccountSyncingInProgress: true };
    createUserStorageController({
      messenger,
      initialState: state,
    });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toEqual(state);
  });
});
