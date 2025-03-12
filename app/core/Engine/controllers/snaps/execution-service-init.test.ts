import { WebViewExecutionService } from '@metamask/snaps-controllers/react-native';
import { ControllerInitRequest } from '../../types';
import {
  ExecutionServiceMessenger,
  getExecutionServiceMessenger,
} from '../../messengers/snaps';
import { executionServiceInit } from './execution-service-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/snaps-controllers');
jest.mock('@metamask/snaps-controllers/react-native');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ExecutionServiceMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getExecutionServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('ExecutionServiceInit', () => {
  it('initializes the webview execution service', () => {
    const { controller } = executionServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(WebViewExecutionService);
  });

  it('passes the proper arguments to the service', () => {
    executionServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(WebViewExecutionService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      setupSnapProvider: expect.any(Function),
    });
  });
});
