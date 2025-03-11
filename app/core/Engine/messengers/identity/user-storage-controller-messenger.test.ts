import { BaseControllerMessenger } from '../../types';
import { getUserStorageControllerMessenger } from './user-storage-controller-messenger';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

describe('getUserStorageControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: BaseControllerMessenger =
      new ExtendedControllerMessenger();
    const mockGetRestricted = jest.spyOn(baseMessenger, 'getRestricted');
    return { baseMessenger, mockGetRestricted };
  };

  it('returns a restricted messenger with the correct configuration', () => {
    const { baseMessenger, mockGetRestricted } = arrangeMocks();

    const restrictedMessenger =
      getUserStorageControllerMessenger(baseMessenger);

    expect(mockGetRestricted).toHaveBeenCalledWith({
      name: 'UserStorageController',
      allowedActions: [
        'KeyringController:getState',
        'KeyringController:withKeyring',
        'SnapController:handleRequest',
        'AuthenticationController:getBearerToken',
        'AuthenticationController:getSessionProfile',
        'AuthenticationController:isSignedIn',
        'AuthenticationController:performSignIn',
        'AccountsController:listAccounts',
        'AccountsController:updateAccountMetadata',
        'NetworkController:getState',
        'NetworkController:addNetwork',
        'NetworkController:removeNetwork',
        'NetworkController:updateNetwork',
      ],
      allowedEvents: [
        'KeyringController:lock',
        'KeyringController:unlock',
        'AccountsController:accountAdded',
        'AccountsController:accountRenamed',
        'NetworkController:networkRemoved',
      ],
    });

    expect(restrictedMessenger).toBeDefined();
  });
});
