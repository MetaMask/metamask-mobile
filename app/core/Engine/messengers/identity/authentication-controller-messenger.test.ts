import { BaseControllerMessenger } from '../../types';
import { getAuthenticationControllerMessenger } from './authentication-controller-messenger';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

describe('getAuthenticationControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: BaseControllerMessenger =
      new ExtendedControllerMessenger();
    const mockGetRestricted = jest.spyOn(baseMessenger, 'getRestricted');
    return { baseMessenger, mockGetRestricted };
  };

  it('returns a restricted messenger with the correct configuration', () => {
    const { baseMessenger, mockGetRestricted } = arrangeMocks();

    const restrictedMessenger =
      getAuthenticationControllerMessenger(baseMessenger);

    expect(mockGetRestricted).toHaveBeenCalledWith({
      name: 'AuthenticationController',
      allowedActions: [
        'KeyringController:getState',
        'SnapController:handleRequest',
      ],
      allowedEvents: ['KeyringController:lock', 'KeyringController:unlock'],
    });

    expect(restrictedMessenger).toBeDefined();
  });
});
