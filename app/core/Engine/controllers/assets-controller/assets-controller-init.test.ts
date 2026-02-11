import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getAssetsControllerMessenger,
  getAssetsControllerInitMessenger,
} from '../../messengers/assets-controller';
import { assetsControllerInit } from './assets-controller-init';
import { AssetsController } from '@metamask/assets-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import {
  ASSETS_UNIFY_STATE_FLAG,
  ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
} from '../../../../selectors/featureFlagController/assetsUnifyState';

jest.mock('@metamask/assets-controller');
jest.mock('@metamask/core-backend', () => ({
  createApiPlatformClient: jest.fn().mockReturnValue({
    fetchTokenBalances: jest.fn(),
  }),
}));

const mockRemoteFeatureFlagController = {
  state: {
    remoteFeatureFlags: {
      [ASSETS_UNIFY_STATE_FLAG]: {
        enabled: true,
        featureVersion: ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
        minimumVersion: '1.0.0',
      },
    },
  },
};

function buildMockMessenger() {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  (baseMessenger.registerActionHandler as jest.Mock)(
    'PreferencesController:getState',
    () => ({
      useTokenDetection: true,
    }),
  );

  (baseMessenger.registerActionHandler as jest.Mock)(
    'AuthenticationController:getBearerToken',
    () => Promise.resolve('mock-bearer-token'),
  );

  return baseMessenger;
}

function getInitRequestMock() {
  const baseMessenger = buildMockMessenger();

  const controllerMessenger = getAssetsControllerMessenger(baseMessenger);
  const initMessenger = getAssetsControllerInitMessenger(baseMessenger);

  const getController = jest.fn().mockImplementation((name: string) => {
    if (name === 'RemoteFeatureFlagController') {
      return mockRemoteFeatureFlagController;
    }
    throw new Error(`Controller "${name}" not found.`);
  });

  return {
    controllerMessenger,
    initMessenger,
    persistedState: {},
    getController,
  };
}

describe('assetsControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the cached API client between tests
    jest.resetModules();
  });

  it('initializes the controller', () => {
    const { controller } = assetsControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(AssetsController);
  });

  it('passes the correct arguments to the controller', () => {
    assetsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AssetsController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {},
      isEnabled: expect.any(Function),
      queryApiClient: expect.any(Object),
      rpcDataSourceConfig: { tokenDetectionEnabled: true },
    });
  });

  it('uses persisted state when available', () => {
    const requestMock = getInitRequestMock();
    const mockPersistedState = {
      someKey: 'someValue',
    };
    requestMock.persistedState = {
      AssetsController: mockPersistedState,
    };

    assetsControllerInit(requestMock);

    const controllerMock = jest.mocked(AssetsController);
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: mockPersistedState,
      }),
    );
  });

  it('uses empty state when persisted state is not available', () => {
    const requestMock = getInitRequestMock();
    requestMock.persistedState = {};

    assetsControllerInit(requestMock);

    const controllerMock = jest.mocked(AssetsController);
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: {},
      }),
    );
  });

  it('passes queryApiClient to the controller', () => {
    assetsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AssetsController);
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryApiClient: expect.any(Object),
      }),
    );
  });

  describe('isEnabled callback', () => {
    it('returns true when feature flag is enabled with correct version', () => {
      const requestMock = getInitRequestMock();
      assetsControllerInit(requestMock);

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(true);
    });

    it('returns false when feature flag is disabled', () => {
      const requestMock = getInitRequestMock();
      requestMock.getController.mockReturnValue({
        state: {
          remoteFeatureFlags: {
            [ASSETS_UNIFY_STATE_FLAG]: {
              enabled: false,
              featureVersion: null,
              minimumVersion: null,
            },
          },
        },
      });

      assetsControllerInit(requestMock);

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(false);
    });

    it('returns false when feature version does not match', () => {
      const requestMock = getInitRequestMock();
      requestMock.getController.mockReturnValue({
        state: {
          remoteFeatureFlags: {
            [ASSETS_UNIFY_STATE_FLAG]: {
              enabled: true,
              featureVersion: '99',
              minimumVersion: '1.0.0',
            },
          },
        },
      });

      assetsControllerInit(requestMock);

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(false);
    });

    it('returns false when getController throws an error', () => {
      const requestMock = getInitRequestMock();
      requestMock.getController.mockImplementation(() => {
        throw new Error('Controller not available');
      });

      assetsControllerInit(requestMock);

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(false);
    });

    it('returns false when feature flag is undefined', () => {
      const requestMock = getInitRequestMock();
      requestMock.getController.mockReturnValue({
        state: {
          remoteFeatureFlags: {},
        },
      });

      assetsControllerInit(requestMock);

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(false);
    });
  });

  describe('tokenDetectionEnabled', () => {
    it('uses useTokenDetection from preferences when available', () => {
      assetsControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(AssetsController);
      expect(controllerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcDataSourceConfig: { tokenDetectionEnabled: true },
        }),
      );
    });

    it('defaults to true when preferences call fails', () => {
      const baseMessenger = new ExtendedMessenger<
        MockAnyNamespace,
        never,
        never
      >({
        namespace: MOCK_ANY_NAMESPACE,
      });

      (baseMessenger.registerActionHandler as jest.Mock)(
        'PreferencesController:getState',
        () => {
          throw new Error('Preferences not available');
        },
      );

      (baseMessenger.registerActionHandler as jest.Mock)(
        'AuthenticationController:getBearerToken',
        () => Promise.resolve('mock-bearer-token'),
      );

      const controllerMessenger = getAssetsControllerMessenger(baseMessenger);
      const initMessenger = getAssetsControllerInitMessenger(baseMessenger);

      assetsControllerInit({
        controllerMessenger,
        initMessenger,
        persistedState: {},
        getController: jest
          .fn()
          .mockReturnValue(mockRemoteFeatureFlagController),
      });

      const controllerMock = jest.mocked(AssetsController);
      expect(controllerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rpcDataSourceConfig: { tokenDetectionEnabled: true },
        }),
      );
    });
  });
});
