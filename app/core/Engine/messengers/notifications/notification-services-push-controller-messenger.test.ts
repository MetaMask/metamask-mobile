import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { NotificationServicesPushControllerMessenger } from '@metamask/notification-services-controller/push-services';
import { getNotificationServicesPushControllerMessenger } from './notification-services-push-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<NotificationServicesPushControllerMessenger>,
  MessengerEvents<NotificationServicesPushControllerMessenger>
>;

describe('getNotificationServicesControllerMessenger', () => {
  const arrangeMocks = () => {
    const baseMessenger: RootMessenger = new Messenger<
      MockAnyNamespace,
      never,
      never
    >({
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
