import { WebViewExecutionService } from '@metamask/snaps-controllers/react-native';
import { ControllerInitRequest } from '../../types';
import {
  ExecutionServiceMessenger,
  getExecutionServiceMessenger,
} from '../../messengers/snaps';
import { executionServiceInit } from './execution-service-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
import { SnapBridge } from '../../../Snaps';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/snaps-controllers');
jest.mock('@metamask/snaps-controllers/react-native');
jest.mock('../../../Snaps');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ExecutionServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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

  describe('setupSnapProvider', () => {
    it('sets up the snap provider', () => {
      executionServiceInit(getInitRequestMock());
      const controllerMock = jest.mocked(WebViewExecutionService);
      const setupSnapProvider =
        controllerMock.mock.calls[0][0].setupSnapProvider;

      const snapId = 'test-snap-id';
      const connectionStream = new Duplex();

      const snapBridgeMock = jest.mocked(SnapBridge);
      const setupProviderConnection = jest.fn();

      // @ts-expect-error: Partial mock.
      snapBridgeMock.mockImplementationOnce(() => ({
        setupProviderConnection,
      }));

      setupSnapProvider(snapId, connectionStream);

      expect(setupProviderConnection).toHaveBeenCalled();
      expect(snapBridgeMock).toHaveBeenCalledWith({
        snapId,
        connectionStream,
        getRPCMethodMiddleware: expect.any(Function),
      });

      const getRPCMethodMiddleware =
        snapBridgeMock.mock.calls[0][0].getRPCMethodMiddleware;
      const rpcMethodMiddleware = getRPCMethodMiddleware({
        hostname: 'test-hostname',
        getProviderState: jest.fn(),
      });

      expect(rpcMethodMiddleware).toBeInstanceOf(Function);
    });
  });
});
