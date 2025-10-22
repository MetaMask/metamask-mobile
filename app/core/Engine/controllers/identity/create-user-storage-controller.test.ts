import {
  UserStorageControllerMessenger,
  UserStorageControllerState,
  Controller as UserStorageController,
  defaultState,
} from '@metamask/profile-sync-controller/user-storage';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { createUserStorageController } from './create-user-storage-controller';
import { calculateScryptKey } from './calculate-scrypt-key';

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
          // Snap Controller Requests
          'SnapController:handleRequest',
          // Auth Controller Requests
          'AuthenticationController:getBearerToken',
          'AuthenticationController:getSessionProfile',
          'AuthenticationController:isSignedIn',
          'AuthenticationController:performSignIn',
        ],
        allowedEvents: [
          // Keyring Controller Events
          'KeyringController:lock',
          'KeyringController:unlock',
        ],
      });

    const nativeScryptCrypto = calculateScryptKey;

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
      nativeScryptCrypto,
      mockConstructor,
      assertGetConstructorCall,
    };
  };

  it('returns controller instance', () => {
    const { messenger, nativeScryptCrypto } = arrange();
    const controller = createUserStorageController({
      messenger,
      nativeScryptCrypto,
    });
    expect(controller).toBeInstanceOf(UserStorageController);
  });

  it('can pass undefined as initial state', () => {
    const { messenger, nativeScryptCrypto, assertGetConstructorCall } =
      arrange();
    createUserStorageController({ messenger, nativeScryptCrypto });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toBe(undefined);
  });

  it('uses initial state that is provided', () => {
    const { messenger, nativeScryptCrypto, assertGetConstructorCall } =
      arrange();
    const state = { ...defaultState, isAccountSyncingEnabled: true };
    createUserStorageController({
      messenger,
      initialState: state,
      nativeScryptCrypto,
    });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toEqual(state);
  });
});
