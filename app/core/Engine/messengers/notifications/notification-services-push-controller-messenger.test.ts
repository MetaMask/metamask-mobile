import { RootExtendedMessenger } from '../../types';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getNotificationServicesPushControllerMessenger } from './notification-services-push-controller-messenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

describe('getNotificationServicesControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: RootExtendedMessenger =
      new ExtendedMessenger<MockAnyNamespace>({
        namespace: MOCK_ANY_NAMESPACE,
      });
    const mockDelegate = jest.spyOn(baseMessenger, 'delegate');
    return { baseMessenger, mockDelegate };
  };

  it('returns a delegated messenger with the correct configuration', () => {
    const { baseMessenger, mockDelegate } = arrangeMocks();

    const delegatedMessenger =
      getNotificationServicesPushControllerMessenger(baseMessenger);

    expect(mockDelegate).toHaveBeenCalledWith({
      actions: ['AuthenticationController:getBearerToken'],
      events: [],
      messenger: delegatedMessenger,
    });

    expect(delegatedMessenger).toBeDefined();
  });
});
