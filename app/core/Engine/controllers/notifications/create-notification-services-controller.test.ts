import {
  NotificationServicesControllerMessenger,
  NotificationServicesControllerState,
  Controller as NotificationServicesController,
  defaultState,
} from '@metamask/notification-services-controller/notification-services';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { createNotificationServicesController } from './create-notification-services-controller';
import { getNotificationServicesControllerMessenger } from '../../messengers/notifications/notification-services-controller-messenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/notification-services-controller/notification-services');
jest.mock('react-native-device-info', () => ({ getVersion: () => '1.2.3' }));

describe('Notification Services Controller', () => {
  beforeEach(() => jest.resetAllMocks());

  const arrange = () => {
    const globalMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
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

  it('initialises with correct messenger and state', () => {
    const { messenger, assertGetConstructorCall } = arrange();
    const state = { ...defaultState, isFeatureAnnouncementsEnabled: true };
    createNotificationServicesController({ messenger, initialState: state });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams).toStrictEqual({
      messenger,
      state,
      env: {
        featureAnnouncements: {
          platform: 'mobile',
          spaceId: expect.any(String),
          accessToken: expect.any(String),
          platformVersion: expect.any(String),
        },
        locale: expect.any(Function),
      },
    });
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
