import {
  defaultState,
  Controller as NotificationServicesPushController,
} from '@metamask/notification-services-controller/push-services';

import Logger from '../../../../util/Logger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
// eslint-disable-next-line import/no-namespace
import * as createNotificationServicesPushControllerModule from './create-notification-services-push-controller';
import { notificationServicesPushControllerInit } from './notification-services-push-controller-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

describe('notificationServicesControllerInit', () => {
  const arrangeMocks = () => {
    const mockLog = jest.spyOn(Logger, 'log');
    const mockCreateController = jest
      .spyOn(
        createNotificationServicesPushControllerModule,
        'createNotificationServicesPushController',
      )
      .mockReturnValue({} as NotificationServicesPushController);

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

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

    notificationServicesPushControllerInit({
      ...othersMocks,
      persistedState: { NotificationServicesPushController: undefined },
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
    const { mockCreateController, mockLog, ...othersMocks } = arrangeMocks();

    notificationServicesPushControllerInit({
      ...othersMocks,
      persistedState: {
        NotificationServicesPushController: { isPushEnabled: true },
      },
    });

    expect(mockCreateController).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Creating NotificationServicesPushController with initial state',
    );
  });
});
