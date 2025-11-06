import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getNetworkControllerInitMessenger,
  getNetworkControllerMessenger,
  NetworkControllerInitMessenger,
  type NetworkControllerMessenger,
} from '../messengers/network-controller-messenger';
import { ControllerInitRequest } from '../types';
import {
  ADDITIONAL_DEFAULT_NETWORKS,
  getInitialNetworkControllerState,
  networkControllerInit,
} from './network-controller-init';
import {
  getDefaultNetworkControllerState,
  NetworkController,
} from '@metamask/network-controller';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';

jest.mock('@metamask/network-controller');

function getInitRequestMock(
  baseMessenger: ExtendedControllerMessenger<
    never,
    never
  > = new ExtendedControllerMessenger<never, never>(),
): jest.Mocked<
  ControllerInitRequest<
    NetworkControllerMessenger,
    NetworkControllerInitMessenger
  >
> {
  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getNetworkControllerMessenger(baseMessenger),
    initMessenger: getNetworkControllerInitMessenger(baseMessenger),
  };

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed.
    'RemoteFeatureFlagController:getState',
    jest.fn().mockReturnValue({
      remoteFeatureFlags: {
        walletFrameworkRpcFailoverEnabled: true,
      },
    }),
  );

  return requestMock;
}

describe('networkControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  jest
    .mocked(getDefaultNetworkControllerState)
    .mockImplementation((additionalNetworks) =>
      jest
        .requireActual('@metamask/network-controller')
        .getDefaultNetworkControllerState(additionalNetworks),
    );

  it('initializes the controller', () => {
    const { controller } = networkControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(NetworkController);
  });

  it('passes the proper arguments to the controller', () => {
    networkControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: getInitialNetworkControllerState({}),
      additionalDefaultNetworks: ADDITIONAL_DEFAULT_NETWORKS,
      getBlockTrackerOptions: expect.any(Function),
      getRpcServiceOptions: expect.any(Function),
      infuraProjectId: 'NON_EMPTY',
    });
  });

  it('enables RPC failover when initialized with the `walletFrameworkRpcFailoverEnabled` feature flag enabled', () => {
    const baseMessenger = new ExtendedControllerMessenger<
      RemoteFeatureFlagControllerGetStateAction,
      never
    >();

    const initRequest = getInitRequestMock(baseMessenger);

    baseMessenger.unregisterActionHandler(
      'RemoteFeatureFlagController:getState',
    );
    baseMessenger.registerActionHandler(
      'RemoteFeatureFlagController:getState',
      jest.fn().mockReturnValue({
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: true,
        },
      }),
    );

    networkControllerInit(initRequest);

    const controllerMock = jest.mocked(NetworkController);
    expect(
      controllerMock.mock.instances[0].enableRpcFailover,
    ).toHaveBeenCalledTimes(1);
  });

  it('disables RPC failover when initialized with the `walletFrameworkRpcFailoverEnabled` feature flag disabled', () => {
    const baseMessenger = new ExtendedControllerMessenger<
      RemoteFeatureFlagControllerGetStateAction,
      never
    >();

    const initRequest = getInitRequestMock(baseMessenger);

    baseMessenger.unregisterActionHandler(
      'RemoteFeatureFlagController:getState',
    );
    baseMessenger.registerActionHandler(
      'RemoteFeatureFlagController:getState',
      jest.fn().mockReturnValue({
        remoteFeatureFlags: {
          walletFrameworkRpcFailoverEnabled: false,
        },
      }),
    );

    networkControllerInit(initRequest);

    const controllerMock = jest.mocked(NetworkController);
    expect(
      controllerMock.mock.instances[0].disableRpcFailover,
    ).toHaveBeenCalledTimes(1);
  });

  it('enables RPC failover when the `walletFrameworkRpcFailoverEnabled` feature flag is enabled on state change', () => {
    const baseMessenger = new ExtendedControllerMessenger<never, never>();
    const initRequest = getInitRequestMock(baseMessenger);
    networkControllerInit(initRequest);

    const controllerMock = jest.mocked(NetworkController);

    // @ts-expect-error: Partial mock.
    baseMessenger.publish('RemoteFeatureFlagController:stateChange', {
      remoteFeatureFlags: {
        walletFrameworkRpcFailoverEnabled: true,
      },
    });

    expect(
      controllerMock.mock.instances[0].enableRpcFailover,
    ).toHaveBeenCalledTimes(2);
  });

  it('disables RPC failover when the `walletFrameworkRpcFailoverEnabled` feature flag is disabled on state change', () => {
    const baseMessenger = new ExtendedControllerMessenger<never, never>();
    const initRequest = getInitRequestMock(baseMessenger);
    networkControllerInit(initRequest);

    const controllerMock = jest.mocked(NetworkController);

    // @ts-expect-error: Partial mock.
    baseMessenger.publish('RemoteFeatureFlagController:stateChange', {
      remoteFeatureFlags: {
        walletFrameworkRpcFailoverEnabled: false,
      },
    });

    expect(
      controllerMock.mock.instances[0].disableRpcFailover,
    ).toHaveBeenCalledTimes(1);
  });
});
