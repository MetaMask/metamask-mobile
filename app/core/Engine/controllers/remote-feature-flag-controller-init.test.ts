import { remoteFeatureFlagControllerInit } from './remote-feature-flag-controller-init';
import {
  ClientConfigApiService,
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger,
} from '@metamask/remote-feature-flag-controller';
import { MessengerClientInitRequest } from '../types';
import { getRemoteFeatureFlagControllerMessenger } from '../messengers/remote-feature-flag-controller-messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import Logger from '../../../util/Logger';

const mockSubscribe = jest.fn();
const mockGetState = jest.fn();

jest.mock('../../../store', () => ({
  store: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    getState: () => mockGetState(),
  },
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

const mockUpdate = jest.fn();
const mockEnable = jest.fn();
const mockDisable = jest.fn();
const mockUpdateRemoteFeatureFlags = jest.fn().mockResolvedValue(undefined);

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ...jest.requireActual('@metamask/remote-feature-flag-controller'),
  RemoteFeatureFlagController: jest.fn().mockImplementation(() => ({
    updateRemoteFeatureFlags: mockUpdateRemoteFeatureFlags,
    update: mockUpdate,
    enable: mockEnable,
    disable: mockDisable,
  })),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<RemoteFeatureFlagControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
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
    mockGetState.mockReturnValue({
      settings: {
        basicFunctionalityEnabled: true,
      },
    });
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

    expect(mockUpdateRemoteFeatureFlags).toHaveBeenCalled();
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

    expect(mockUpdateRemoteFeatureFlags).not.toHaveBeenCalled();
  });

  it('clears cached remote flags when controller is disabled at init', () => {
    const initRequestMock = getInitRequestMock();

    // @ts-expect-error: Partial mock.
    initRequestMock.getState.mockImplementation(() => ({
      settings: {
        basicFunctionalityEnabled: false,
      },
    }));

    remoteFeatureFlagControllerInit(initRequestMock);

    expect(mockUpdate).toHaveBeenCalledWith(expect.any(Function));
    const callback = mockUpdate.mock.calls[0][0];
    const nextState = callback({
      remoteFeatureFlags: { otaUpdatesEnabled: true },
      rawRemoteFeatureFlags: { otaUpdatesEnabled: true },
      localOverrides: { testOverride: true },
      cacheTimestamp: 123,
    });

    expect(nextState).toEqual({
      remoteFeatureFlags: {},
      rawRemoteFeatureFlags: {},
      localOverrides: { testOverride: true },
      cacheTimestamp: 0,
    });
  });

  it('subscribes to basic functionality changes', () => {
    remoteFeatureFlagControllerInit(getInitRequestMock());

    expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it('syncs controller when basic functionality changes', () => {
    remoteFeatureFlagControllerInit(getInitRequestMock());

    const subscribeCallback = mockSubscribe.mock.calls[0][0] as () => void;

    mockGetState.mockReturnValue({
      settings: {
        basicFunctionalityEnabled: false,
      },
    });
    subscribeCallback();

    expect(mockDisable).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
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
    mockUpdateRemoteFeatureFlags.mockRejectedValueOnce(mockError);

    remoteFeatureFlagControllerInit(initRequestMock);

    await new Promise(process.nextTick);

    expect(Logger.log).toHaveBeenCalledWith(
      'Feature flags update failed: ',
      mockError,
    );
  });
});
