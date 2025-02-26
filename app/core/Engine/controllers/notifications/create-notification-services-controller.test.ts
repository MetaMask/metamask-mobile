import {
  NotificationServicesControllerMessenger,
  NotificationServicesControllerState,
  Controller as NotificationServicesController,
  defaultState,
} from '@metamask/notification-services-controller/notification-services';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { createNotificationServicesController } from './create-notification-services-controller';

jest.mock('@metamask/notification-services-controller/notification-services');

describe('Notification Services Controller', () => {
  beforeEach(() => jest.resetAllMocks());

  const arrange = () => {
    const globalMessenger = new ExtendedControllerMessenger();
    const messenger: NotificationServicesControllerMessenger =
      globalMessenger.getRestricted({
        name: 'NotificationServicesController',
        allowedActions: [
          // Keyring Actions
          'KeyringController:getState',
          'KeyringController:getAccounts',
          // Auth Actions
          'AuthenticationController:getBearerToken',
          'AuthenticationController:isSignedIn',
          'AuthenticationController:performSignIn',
          // Storage Actions
          'UserStorageController:getStorageKey',
          'UserStorageController:performGetStorage',
          'UserStorageController:performSetStorage',
          // Push Actions
          'NotificationServicesPushController:enablePushNotifications',
          'NotificationServicesPushController:disablePushNotifications',
          'NotificationServicesPushController:updateTriggerPushNotifications',
          'NotificationServicesPushController:subscribeToPushNotifications',
        ],
        allowedEvents: [
          // Keyring Events
          'KeyringController:unlock',
          'KeyringController:lock',
          'KeyringController:stateChange',
          // Push Events
          'NotificationServicesPushController:onNewNotifications',
          'NotificationServicesPushController:stateChange',
        ],
      });

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
