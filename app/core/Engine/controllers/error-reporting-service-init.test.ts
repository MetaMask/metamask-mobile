import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getErrorReportingServiceMessenger } from '../messengers/error-reporting-service-messenger';
import { ControllerInitRequest } from '../types';
import { errorReportingServiceInit } from './error-reporting-service-init';
import {
  ErrorReportingService,
  ErrorReportingServiceMessenger,
} from '@metamask/error-reporting-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/error-reporting-service');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ErrorReportingServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
