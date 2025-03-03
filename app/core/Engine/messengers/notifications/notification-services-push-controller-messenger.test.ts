import { BaseControllerMessenger } from '../../types';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { getNotificationServicesPushControllerMessenger } from './notification-services-push-controller-messenger';

describe('getNotificationServicesControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: BaseControllerMessenger =
      new ExtendedControllerMessenger();
    const mockGetRestricted = jest.spyOn(baseMessenger, 'getRestricted');
    return { baseMessenger, mockGetRestricted };
  };

  it('returns a restricted messenger with the correct configuration', () => {
    const { baseMessenger, mockGetRestricted } = arrangeMocks();

    const restrictedMessenger =
      getNotificationServicesPushControllerMessenger(baseMessenger);

    expect(mockGetRestricted).toHaveBeenCalledWith({
      name: 'NotificationServicesPushController',
      allowedActions: ['AuthenticationController:getBearerToken'],
      allowedEvents: [],
    });

    expect(restrictedMessenger).toBeDefined();
  });
});
