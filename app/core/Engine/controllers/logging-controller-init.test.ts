import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getLoggingControllerMessenger,
  type LoggingControllerMessenger,
} from '../messengers/logging-controller-messenger';
import { ControllerInitRequest } from '../types';
import { loggingControllerInit } from './logging-controller-init';
import { LoggingController } from '@metamask/logging-controller';

jest.mock('@metamask/logging-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<LoggingControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getLoggingControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('LoggingControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = loggingControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(LoggingController);
  });

  it('passes the proper arguments to the controller', () => {
    loggingControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(LoggingController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });
});
