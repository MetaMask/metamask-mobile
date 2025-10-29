import { remoteFeatureFlagControllerInit } from './remote-feature-flag-controller-init';
import {
  ClientConfigApiService,
  RemoteFeatureFlagController,
} from '@metamask/remote-feature-flag-controller';
import { ControllerInitRequest } from '../types';
import {
  getRemoteFeatureFlagControllerMessenger,
  RemoteFeatureFlagControllerMessenger,
} from '../messengers/remote-feature-flag-controller-messenger';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../utils/test-utils';

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ...jest.requireActual('@metamask/remote-feature-flag-controller'),
  RemoteFeatureFlagController: jest.fn().mockImplementation(() => ({
    updateRemoteFeatureFlags: jest.fn().mockResolvedValue(undefined),
  })),
}));

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<RemoteFeatureFlagControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getRemoteFeatureFlagControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial mock.
  requestMock.getState.mockImplementation(() => ({
    settings: {
      basicFunctionalityEnabled: true,
    },
  }));

  return requestMock;
}

describe('remoteFeatureFlagControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } =
      remoteFeatureFlagControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(Object);
  });

  it('passes the proper arguments to the controller', () => {
    remoteFeatureFlagControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(RemoteFeatureFlagController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      disabled: false,
      getMetaMetricsId: expect.any(Function),
      clientConfigApiService: expect.any(ClientConfigApiService),
      fetchInterval: 900_000,
    });
  });

  it('calls `updateRemoteFeatureFlags` when enabled', () => {
    const initRequestMock = getInitRequestMock();

    // @ts-expect-error: Partial mock.
    initRequestMock.getState.mockImplementation(() => ({
      settings: {
        basicFunctionalityEnabled: true,
      },
    }));

    remoteFeatureFlagControllerInit(initRequestMock);

    const controllerMock = jest.mocked(RemoteFeatureFlagController);
    expect(
      controllerMock.mock.results[0].value.updateRemoteFeatureFlags,
    ).toHaveBeenCalled();
  });

  it('does not call `updateRemoteFeatureFlags` when controller is disabled', () => {
    const initRequestMock = getInitRequestMock();

    // @ts-expect-error: Partial mock.
    initRequestMock.getState.mockImplementation(() => ({
      settings: {
        basicFunctionalityEnabled: false,
      },
    }));

    remoteFeatureFlagControllerInit(initRequestMock);

    const controllerMock = jest.mocked(RemoteFeatureFlagController);
    expect(
      controllerMock.mock.results[0].value.updateRemoteFeatureFlags,
    ).not.toHaveBeenCalled();
  });
});
