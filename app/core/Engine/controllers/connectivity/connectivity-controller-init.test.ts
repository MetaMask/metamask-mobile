import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getConnectivityControllerMessenger } from '../../messengers/connectivity-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { connectivityControllerInit } from './connectivity-controller-init';
import {
  ConnectivityController,
  ConnectivityControllerMessenger,
  CONNECTIVITY_STATUSES,
} from '@metamask/connectivity-controller';
import { NetInfoConnectivityAdapter } from './netinfo-connectivity-adapter';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

// Mock NetInfoConnectivityAdapter since it uses NetInfo which requires native modules
jest.mock('./netinfo-connectivity-adapter');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<ConnectivityControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getConnectivityControllerMessenger(baseMessenger),
  };

  return requestMock;
}

describe('ConnectivityControllerInit', () => {
  let mockNetInfoAdapter: jest.Mocked<NetInfoConnectivityAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock NetInfoConnectivityAdapter
    mockNetInfoAdapter = {
      getStatus: jest.fn().mockReturnValue(CONNECTIVITY_STATUSES.Online),
      onConnectivityChange: jest.fn(),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<NetInfoConnectivityAdapter>;

    (NetInfoConnectivityAdapter as jest.Mock).mockImplementation(
      () => mockNetInfoAdapter,
    );
  });

  it('initializes the controller', () => {
    const { controller } = connectivityControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(ConnectivityController);
  });

  it('creates NetInfoConnectivityAdapter instance', () => {
    connectivityControllerInit(getInitRequestMock());

    expect(NetInfoConnectivityAdapter).toHaveBeenCalledTimes(1);
  });

  it('initializes controller with correct name and state', () => {
    const requestMock = getInitRequestMock();
    const { controller } = connectivityControllerInit(requestMock);

    expect(controller.name).toBe('ConnectivityController');
    expect(controller.state).toBeDefined();
    expect(controller.state.connectivityStatus).toBeDefined();
  });

  it('initializes with online status by default', () => {
    const { controller } = connectivityControllerInit(getInitRequestMock());

    // NetInfoConnectivityAdapter defaults to online until state is fetched
    expect(controller.state.connectivityStatus).toBe(
      CONNECTIVITY_STATUSES.Online,
    );
  });

  it('subscribes to connectivity service changes', () => {
    connectivityControllerInit(getInitRequestMock());

    expect(mockNetInfoAdapter.onConnectivityChange).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });
});
