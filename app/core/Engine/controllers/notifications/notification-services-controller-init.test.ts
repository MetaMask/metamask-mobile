import {
  NotificationServicesControllerMessenger,
  defaultState,
  Controller as NotificationServicesController,
} from '@metamask/notification-services-controller/notification-services';
import Logger from '../../../../util/Logger';
// eslint-disable-next-line import/no-namespace
import * as createNotificationServicesControllerModule from './create-notification-services-controller';
import { notificationServicesControllerInit } from './notification-services-controller-init';

describe('notificationServicesControllerInit', () => {
  const arrangeMocks = () => {
    const mockLog = jest.spyOn(Logger, 'log');
    const mockCreateController = jest
      .spyOn(
        createNotificationServicesControllerModule,
        'createNotificationServicesController',
      )
      .mockReturnValue({} as NotificationServicesController);
    const fakeMessenger = {} as NotificationServicesControllerMessenger;
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

    notificationServicesControllerInit({
      controllerMessenger: fakeMessenger,
      persistedState: { NotificationServicesController: undefined },
      ...othersMocks,
    });

    expect(mockCreateController).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Creating NotificationServicesController with default state',
      {
        defaultState,
      },
    );
  });

  it('logs and returns controller with initial state', () => {
    const { fakeMessenger, mockCreateController, mockLog, ...othersMocks } =
      arrangeMocks();

    notificationServicesControllerInit({
      controllerMessenger: fakeMessenger,
      persistedState: {
        NotificationServicesController: { isNotificationServicesEnabled: true },
      },
      ...othersMocks,
    });

    expect(mockCreateController).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Creating NotificationServicesController with initial state',
    );
  });
});
