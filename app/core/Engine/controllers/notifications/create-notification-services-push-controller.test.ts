import { waitFor } from '@testing-library/react-native';
import {
  NotificationServicesPushControllerMessenger,
  NotificationServicesPushControllerState,
  defaultState,
  Controller as NotificationServicesPushController,
} from '@metamask/notification-services-controller/push-services';
import { Platform } from 'react-native';
import { getVersion } from 'react-native-device-info';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { createNotificationServicesPushController } from './create-notification-services-push-controller';
// eslint-disable-next-line import-x/no-namespace
import * as PushUtilsModule from './push-utils';
// eslint-disable-next-line import-x/no-namespace
import * as PushStatusModule from '../../../../util/notifications/utils/push-notification-status';
import { getNotificationServicesPushControllerMessenger } from '../../messengers/notifications/notification-services-push-controller-messenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/notification-services-controller/push-services');
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.42.0'),
}));

describe('Notification Services Controller', () => {
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getVersion).mockReturnValue('7.42.0');
    Platform.OS = originalPlatformOs;
  });

  const arrangeFirebaseMocks = () => {
    const mockCreateRegToken = jest.spyOn(PushUtilsModule, 'createRegToken');
    const mockDeleteRegToken = jest.spyOn(PushUtilsModule, 'deleteRegToken');
    const mockCreateSubscribeToPushNotifications = jest.spyOn(
      PushUtilsModule,
      'createSubscribeToPushNotifications',
    );
    const mockResolvePushNotificationStatus = jest
      .spyOn(PushStatusModule, 'resolvePushNotificationStatus')
      .mockResolvedValue({
        controllerIsPushEnabled: true,
        effectivePushEnabled: true,
        nativeOsPermissionEnabled: true,
      });

    return {
      mockCreateRegToken,
      mockDeleteRegToken,
      mockCreateSubscribeToPushNotifications,
      mockResolvePushNotificationStatus,
    };
  };

  const arrange = ({ isPushEnabled = true } = {}) => {
    const globalMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const messenger: NotificationServicesPushControllerMessenger =
      getNotificationServicesPushControllerMessenger(globalMessenger);

    const mockConstructor = jest.spyOn(
      NotificationServicesPushController.prototype,
      // @ts-expect-error - this is not something you should be able to call, but this is a mock
      'constructor',
    );

    const assertGetConstructorCall = () =>
      mockConstructor.mock.calls[0][0] as unknown as {
        state: NotificationServicesPushControllerState;
        config: {
          appVersion?: string;
          os?: string;
        };
      };

    const mockDisablePushNotifications = jest
      .spyOn(
        NotificationServicesPushController.prototype,
        'disablePushNotifications',
      )
      .mockResolvedValue();

    // Redefine .state get calls
    Object.defineProperty(
      NotificationServicesPushController.prototype,
      'state',
      {
        value: {
          isPushEnabled,
        },
        configurable: true, // Make it configurable so it can be redefined later if needed
      },
    );

    return {
      globalMessenger,
      messenger,
      mockConstructor,
      assertGetConstructorCall,
      mockDisablePushNotifications,
      ...arrangeFirebaseMocks(),
    };
  };

  it('returns controller instance', () => {
    const { messenger } = arrange();
    const controller = createNotificationServicesPushController({
      messenger,
    });
    expect(controller).toBeInstanceOf(NotificationServicesPushController);
  });

  it('uses default state if not state provided', () => {
    const { messenger, assertGetConstructorCall } = arrange();
    createNotificationServicesPushController({ messenger });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toEqual(defaultState);
  });

  it('uses initial state that is provided', () => {
    const { messenger, assertGetConstructorCall } = arrange();
    const state: NotificationServicesPushControllerState = {
      ...defaultState,
      fcmToken: 'TOKEN',
    };
    createNotificationServicesPushController({
      messenger,
      initialState: state,
    });
    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.state).toEqual(state);
  });

  it('passes mobile OS and app version metadata for push registration', () => {
    Platform.OS = 'android';
    jest.mocked(getVersion).mockReturnValue('7.80.0');

    const { messenger, assertGetConstructorCall } = arrange();
    createNotificationServicesPushController({ messenger });

    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.config).toEqual(
      expect.objectContaining({
        os: 'android',
        appVersion: '7.80.0',
      }),
    );
  });

  it('omits app version metadata when the version is not API-safe', () => {
    Platform.OS = 'ios';
    jest.mocked(getVersion).mockReturnValue('7.80.0-flask.1');

    const { messenger, assertGetConstructorCall } = arrange();
    createNotificationServicesPushController({ messenger });

    const constructorParams = assertGetConstructorCall();
    expect(constructorParams?.config).toEqual(
      expect.not.objectContaining({
        appVersion: expect.any(String),
      }),
    );
    expect(constructorParams?.config).toEqual(
      expect.objectContaining({
        os: 'ios',
      }),
    );
  });

  it('runs push notification side effect to disable the controller if the mobile device has not enabled push notifications', async () => {
    // Arrange
    const {
      messenger,
      mockResolvePushNotificationStatus,
      mockDisablePushNotifications,
    } = arrange();
    mockResolvePushNotificationStatus.mockResolvedValue({
      controllerIsPushEnabled: true,
      effectivePushEnabled: false,
      nativeOsPermissionEnabled: false,
    });

    // Act
    createNotificationServicesPushController({ messenger });

    // Assert - push notifications have been disabled
    await waitFor(() => {
      expect(mockDisablePushNotifications).toHaveBeenCalled();
    });
  });

  it('does not resolve native push status when controller push is already disabled', () => {
    const { messenger, mockResolvePushNotificationStatus } = arrange({
      isPushEnabled: false,
    });

    createNotificationServicesPushController({ messenger });

    expect(mockResolvePushNotificationStatus).not.toHaveBeenCalled();
  });
});
