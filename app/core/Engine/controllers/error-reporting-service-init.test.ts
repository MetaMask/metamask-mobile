import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getErrorReportingServiceMessenger,
  type ErrorReportingServiceMessenger,
} from '../messengers/error-reporting-service-messenger';
import { ControllerInitRequest } from '../types';
import { errorReportingServiceInit } from './error-reporting-service-init';
import { ErrorReportingService } from '@metamask/error-reporting-service';

jest.mock('@metamask/error-reporting-service');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ErrorReportingServiceMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getErrorReportingServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('errorReportingServiceInit', () => {
  it('initializes the controller', () => {
    const { controller } = errorReportingServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ErrorReportingService);
  });

  it('passes the proper arguments to the controller', () => {
    errorReportingServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(ErrorReportingService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      captureException: expect.any(Function),
    });
  });
});
