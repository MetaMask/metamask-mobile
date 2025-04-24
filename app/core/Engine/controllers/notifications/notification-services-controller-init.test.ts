import {
  defaultState,
  Controller as NotificationServicesController,
} from '@metamask/notification-services-controller/notification-services';

import Logger from '../../../../util/Logger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
// eslint-disable-next-line import/no-namespace
import * as createNotificationServicesControllerModule from './create-notification-services-controller';
import { notificationServicesControllerInit } from './notification-services-controller-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

describe('notificationServicesControllerInit', () => {
  const arrangeMocks = () => {
    const mockLog = jest.spyOn(Logger, 'log');
    const mockCreateController = jest
      .spyOn(
        createNotificationServicesControllerModule,
        'createNotificationServicesController',
      )
      .mockReturnValue({} as NotificationServicesController);

    const baseControllerMessenger = new ExtendedControllerMessenger();

    const initRequestMock = buildControllerInitRequestMock(
      baseControllerMessenger,
    );

    return {
      mockLog,
      mockCreateController,
      ...initRequestMock,
    };
  };

  it('logs and returns controller with default state', () => {
    const { mockCreateController, mockLog, ...othersMocks } = arrangeMocks();

    notificationServicesControllerInit({
      ...othersMocks,
      persistedState: { NotificationServicesController: undefined },
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
    const { mockCreateController, mockLog, ...othersMocks } = arrangeMocks();

    notificationServicesControllerInit({
      ...othersMocks,
      persistedState: {
        NotificationServicesController: { isNotificationServicesEnabled: true },
      },
    });

    expect(mockCreateController).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Creating NotificationServicesController with initial state',
    );
  });
});
