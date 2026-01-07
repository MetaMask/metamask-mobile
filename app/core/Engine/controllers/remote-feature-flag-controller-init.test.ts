import { remoteFeatureFlagControllerInit } from './remote-feature-flag-controller-init';
import {
  ClientConfigApiService,
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger,
} from '@metamask/remote-feature-flag-controller';
import { ControllerInitRequest } from '../types';
import { getRemoteFeatureFlagControllerMessenger } from '../messengers/remote-feature-flag-controller-messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../utils/test-utils';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import Logger from '../../../util/Logger';

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ...jest.requireActual('@metamask/remote-feature-flag-controller'),
  RemoteFeatureFlagController: jest.fn().mockImplementation(() => ({
    updateRemoteFeatureFlags: jest.fn().mockResolvedValue(undefined),
  })),
}));

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<RemoteFeatureFlagControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
      clientVersion: expect.any(String),
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

  it('logs success message when feature flags update successfully', async () => {
    const initRequestMock = getInitRequestMock();

    remoteFeatureFlagControllerInit(initRequestMock);

    await new Promise(process.nextTick);

    expect(Logger.log).toHaveBeenCalledWith('Feature flags updated');
  });

  it('logs error message when feature flags update fails', async () => {
    const initRequestMock = getInitRequestMock();
    const mockError = new Error('Network error');
    const controllerMock = jest.mocked(RemoteFeatureFlagController);
    controllerMock.mockImplementationOnce(
      () =>
        ({
          updateRemoteFeatureFlags: jest.fn().mockRejectedValue(mockError),
        }) as unknown as RemoteFeatureFlagController,
    );

    remoteFeatureFlagControllerInit(initRequestMock);

    await new Promise(process.nextTick);

    expect(Logger.log).toHaveBeenCalledWith(
      'Feature flags update failed: ',
      mockError,
    );
  });
});
