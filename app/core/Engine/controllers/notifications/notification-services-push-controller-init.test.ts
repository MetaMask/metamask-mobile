import {
  NotificationServicesPushControllerMessenger,
  defaultState,
  Controller as NotificationServicesPushController,
} from '@metamask/notification-services-controller/push-services';
import Logger from '../../../../util/Logger';
// eslint-disable-next-line import/no-namespace
import * as createNotificationServicesPushControllerModule from './create-notification-services-push-controller';
import { notificationServicesPushControllerInit } from './notification-services-push-controller-init';

describe('notificationServicesControllerInit', () => {
  const arrangeMocks = () => {
    const mockLog = jest.spyOn(Logger, 'log');
    const mockCreateController = jest
      .spyOn(
        createNotificationServicesPushControllerModule,
        'createNotificationServicesPushController',
      )
      .mockReturnValue({} as NotificationServicesPushController);
    const fakeMessenger = {} as NotificationServicesPushControllerMessenger;

    return {
      mockLog,
      mockCreateController,
      fakeMessenger,
      getController: jest.fn(),
      getCurrentChainId: jest.fn(),
      getRootState: jest.fn(),
      initMessenger: jest.fn() as unknown as void,
    };
  };

  it('logs and returns controller with default state', () => {
    const { fakeMessenger, mockCreateController, mockLog, ...othersMocks } =
      arrangeMocks();

    notificationServicesPushControllerInit({
      controllerMessenger: fakeMessenger,
      persistedState: { NotificationServicesPushController: undefined },
      ...othersMocks,
    });

    expect(mockCreateController).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Creating NotificationServicesPushController with default state',
      {
        defaultState,
      },
    );
  });

  it('logs and returns controller with initial state', () => {
    const { fakeMessenger, mockCreateController, mockLog, ...othersMocks } =
      arrangeMocks();

    notificationServicesPushControllerInit({
      controllerMessenger: fakeMessenger,
      persistedState: {
        NotificationServicesPushController: { isPushEnabled: true },
      },
      ...othersMocks,
    });

    expect(mockCreateController).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Creating NotificationServicesPushController with initial state',
    );
  });
});
