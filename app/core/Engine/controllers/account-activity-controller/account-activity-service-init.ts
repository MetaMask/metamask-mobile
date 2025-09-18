import {
  AccountActivityService,
  type AccountActivityServiceMessenger,
  type WebSocketService,
} from '@metamask/backend-platform';
import { ControllerInitFunction, ControllerInitRequest } from '../../types';
import Logger from '../../../../util/Logger';

/**
 * Initialize the Account Activity service.
 * This service monitors real-time account activity and transaction updates
 * using WebSocket connections through the Backend WebSocket service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.getController - Function to retrieve other controllers.
 * @returns The initialized service.
 */
export const accountActivityServiceInit: ControllerInitFunction<
  AccountActivityService,
  AccountActivityServiceMessenger
> = (request) => {
  const { controllerMessenger } = request;
  const { backendWebSocketService } = getControllers(request);

  try {
    const controller = new AccountActivityService({
      messenger: controllerMessenger,
      webSocketService: backendWebSocketService,
    });

    return {
      controller,
    };
  } catch (error) {
    Logger.error(
      error as Error,
      '[AccountActivity] Failed to initialize service',
    );
    throw error;
  }
};

function getControllers(
  request: ControllerInitRequest<AccountActivityServiceMessenger>,
) {
  return {
    backendWebSocketService: request.getController(
      'BackendWebSocketService',
    ) as WebSocketService,
  };
}
