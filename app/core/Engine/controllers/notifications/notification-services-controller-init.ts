import {
  NotificationServicesControllerMessenger,
  NotificationServicesControllerState,
  Controller as NotificationServicesController,
  defaultState,
} from '@metamask/notification-services-controller/notification-services';
import { ControllerInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import { createNotificationServicesController } from './create-notification-services-controller';

const logControllerCreation = (
  initialState?: Partial<NotificationServicesControllerState>,
) => {
  if (!initialState) {
    Logger.log('Creating NotificationServicesController with default state', {
      defaultState,
    });
  } else {
    Logger.log('Creating NotificationServicesController with initial state');
  }
};

export const notificationServicesControllerInit: ControllerInitFunction<
  NotificationServicesController,
  NotificationServicesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const initialState = persistedState.NotificationServicesController;
  logControllerCreation(initialState);

  const state = persistedState.NotificationServicesController ?? defaultState;

  const controller = createNotificationServicesController({
    messenger: controllerMessenger,
    initialState: state,
  });

  return { controller };
};
