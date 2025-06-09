import {
  NotificationServicesControllerMessenger,
  NotificationServicesControllerState,
  Controller as NotificationServicesController,
  defaultState,
} from '@metamask/notification-services-controller/notification-services';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { createNotificationServicesController } from './create-notification-services-controller';
import { getNotificationServicesControllerMessenger } from '../../messengers/notifications/notification-services-controller-messenger';

jest.mock('@metamask/notification-services-controller/notification-services');

describe('Notification Services Controller', () => {
  beforeEach(() => jest.resetAllMocks());

  const arrange = () => {
    const globalMessenger = new ExtendedControllerMessenger();
    const messenger: NotificationServicesControllerMessenger =
      getNotificationServicesControllerMessenger(globalMessenger);

    const mockConstructor = jest.spyOn(
      NotificationServicesController.prototype,
      // @ts-expect-error - this is not something you should be able to call, but this is a mock
      'constructor',
    );

    const assertGetConstructorCall = () =>
      mockConstructor.mock.calls[0][0] as unknown as {
        state: NotificationServicesControllerState;
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
    const controller = createNotificationServicesController({ messenger });
    expect(controller).toBeInstanceOf(NotificationServicesController);
  });

  it('can pass undefined as initial state', () => {
    const { messenger, assertGetConstructorCall } = arrange();
    createNotificationServicesController({ messenger });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toBe(undefined);
  });

  it('uses initial state that is provided', () => {
    const { messenger, assertGetConstructorCall } = arrange();
    const state = { ...defaultState, isFeatureAnnouncementsEnabled: true };
    createNotificationServicesController({ messenger, initialState: state });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toEqual(state);
  });
});
