import { ControllerInitFunction } from '../types';
import { ErrorReportingService } from '@metamask/error-reporting-service';
import { ErrorReportingServiceMessenger } from '../messengers/error-reporting-service-messenger';
import { captureException } from '@sentry/react-native';

/**
 * Initialize the error reporting service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const errorReportingServiceInit: ControllerInitFunction<
  ErrorReportingService,
  ErrorReportingServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new ErrorReportingService({
    messenger: controllerMessenger,
    captureException,
  });

  return {
    controller,
  };
};
