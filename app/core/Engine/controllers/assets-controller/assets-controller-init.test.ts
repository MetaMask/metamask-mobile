import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getAssetsControllerMessenger,
  getAssetsControllerInitMessenger,
  type AssetsControllerInitMessenger,
  type AssetsControllerMessenger,
} from '../../messengers/assets-controller';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { assetsControllerInit } from './assets-controller-init';
import { AssetsController } from '@metamask/assets-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import {
  ASSETS_UNIFY_STATE_FLAG,
  ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
} from '../../../../selectors/featureFlagController/assetsUnifyState';
import { store } from '../../../../store';

jest.mock('@metamask/assets-controller');
jest.mock('@metamask/core-backend', () => ({
  createApiPlatformClient: jest.fn().mockReturnValue({
    fetchTokenBalances: jest.fn(),
  }),
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
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

interface RemoteFeatureFlagState {
  remoteFeatureFlags: Record<
    string,
    {
      enabled: boolean;
      featureVersion: string | null;
      minimumVersion: string | null;
    }
  >;
}

/** Minimal interface for registering init delegate actions by name (avoids MockAnyNamespace action typing). */
interface MessengerWithRegisterActionHandler {
  registerActionHandler: (
    action: string,
    handler: (...args: unknown[]) => unknown,
  ) => void;
}

/** Registers the init delegate actions on a base messenger (same actions/events the init messenger expects). */
function registerInitActionHandlers(
  messenger: MessengerWithRegisterActionHandler,
  overrides?: {
    remoteFeatureFlagState?: RemoteFeatureFlagState;
    remoteFeatureFlagGetStateThrows?: boolean;
    preferencesGetState?: () => unknown;
  },
): void {
  messenger.registerActionHandler(
    'PreferencesController:getState',
    overrides?.preferencesGetState ?? (() => ({ useTokenDetection: true })),
  );
  messenger.registerActionHandler(
    'AuthenticationController:getBearerToken',
    () => Promise.resolve('mock-bearer-token'),
  );
  messenger.registerActionHandler(
    'RemoteFeatureFlagController:getState',
    () => {
      if (overrides?.remoteFeatureFlagGetStateThrows) {
        throw new Error('Controller not available');
      }
      if (overrides?.remoteFeatureFlagState !== undefined) {
        return overrides.remoteFeatureFlagState;
      }
      return mockRemoteFeatureFlagController.state;
    },
  );
  messenger.registerActionHandler(
    'AnalyticsController:trackEvent',
    () => undefined,
  );
}

function buildMockMessenger(overrides?: {
  remoteFeatureFlagState?: RemoteFeatureFlagState;
  remoteFeatureFlagGetStateThrows?: boolean;
}) {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  registerInitActionHandlers(
    baseMessenger as unknown as MessengerWithRegisterActionHandler,
    overrides,
  );
  return baseMessenger;
}

function getInitRequestMock(overrides?: {
  remoteFeatureFlagState?: RemoteFeatureFlagState;
  remoteFeatureFlagGetStateThrows?: boolean;
}): jest.Mocked<
  ControllerInitRequest<
    AssetsControllerMessenger,
    AssetsControllerInitMessenger
  >
> {
  const baseMessenger = buildMockMessenger(overrides);

  const controllerMessenger = getAssetsControllerMessenger(baseMessenger);
  const initMessenger = getAssetsControllerInitMessenger(baseMessenger);

  return {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger,
    initMessenger,
    persistedState: {},
  } as jest.Mocked<
    ControllerInitRequest<
      AssetsControllerMessenger,
      AssetsControllerInitMessenger
    >
  >;
}

describe('assetsControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the cached API client between tests
    jest.resetModules();
    jest.mocked(store.getState).mockReturnValue({
      settings: { basicFunctionalityEnabled: true },
    } as ReturnType<typeof store.getState>);
  });

  it('initializes the controller', () => {
    const { controller } = assetsControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(AssetsController);
  });

  it('passes the correct arguments to the controller', () => {
    assetsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AssetsController);
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        state: expect.any(Object),
        isBasicFunctionality: expect.any(Function),
        isEnabled: expect.any(Function),
        queryApiClient: expect.any(Object),
        rpcDataSourceConfig: expect.objectContaining({
          tokenDetectionEnabled: expect.any(Function),
          balanceInterval: 30_000,
          detectionInterval: 180_000,
        }),
        priceDataSourceConfig: { pollInterval: 180_000 },
        stakedBalanceDataSourceConfig: {
          pollInterval: 30_000,
          enabled: true,
        },
        trackMetaMetricsEvent: expect.any(Function),
      }),
    );
  });

  it('uses persisted state when available', () => {
    const requestMock = getInitRequestMock();
    const mockPersistedState = {
      someKey: 'someValue',
    };
    requestMock.persistedState = {
      AssetsController: mockPersistedState,
    } as typeof requestMock.persistedState;

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
        state: expect.any(Object),
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
      const requestMock = getInitRequestMock({
        remoteFeatureFlagState: {
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
      const requestMock = getInitRequestMock({
        remoteFeatureFlagState: {
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

    it('returns false when RemoteFeatureFlagController:getState throws', () => {
      const requestMock = getInitRequestMock({
        remoteFeatureFlagGetStateThrows: true,
      });

      assetsControllerInit(requestMock);

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isEnabled = constructorCall.isEnabled as () => boolean;

      expect(isEnabled()).toBe(false);
    });

    it('returns false when feature flag is undefined', () => {
      const requestMock = getInitRequestMock({
        remoteFeatureFlagState: { remoteFeatureFlags: {} },
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
      const constructorCall = controllerMock.mock.calls[0][0];
      const getTokenDetectionEnabled =
        constructorCall.rpcDataSourceConfig?.tokenDetectionEnabled;

      expect(getTokenDetectionEnabled).toBeDefined();
      expect(typeof getTokenDetectionEnabled).toBe('function');
      expect((getTokenDetectionEnabled as () => boolean)()).toBe(true);
    });

    it('defaults to true when preferences call fails', () => {
      const baseMessenger = new ExtendedMessenger<
        MockAnyNamespace,
        never,
        never
      >({
        namespace: MOCK_ANY_NAMESPACE,
      });
      registerInitActionHandlers(
        baseMessenger as unknown as MessengerWithRegisterActionHandler,
        {
          preferencesGetState: () => {
            throw new Error('Preferences not available');
          },
        },
      );

      const controllerMessenger = getAssetsControllerMessenger(baseMessenger);
      const initMessenger = getAssetsControllerInitMessenger(baseMessenger);

      const requestMock = {
        ...buildControllerInitRequestMock(baseMessenger),
        controllerMessenger,
        initMessenger,
        persistedState: {},
      };

      assetsControllerInit(requestMock);

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const getTokenDetectionEnabled =
        constructorCall.rpcDataSourceConfig?.tokenDetectionEnabled;

      expect(getTokenDetectionEnabled).toBeDefined();
      expect((getTokenDetectionEnabled as () => boolean)()).toBe(true);
    });
  });

  describe('isBasicFunctionality', () => {
    it('returns value from Redux store (true when basicFunctionalityEnabled is true)', () => {
      jest.mocked(store.getState).mockReturnValue({
        settings: { basicFunctionalityEnabled: true },
      } as ReturnType<typeof store.getState>);

      assetsControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isBasicFunctionality = constructorCall.isBasicFunctionality as
        | (() => boolean)
        | undefined;
      expect(isBasicFunctionality).toBeDefined();
      expect(isBasicFunctionality?.()).toBe(true);
    });

    it('returns value from Redux store (false when basicFunctionalityEnabled is false)', () => {
      jest.mocked(store.getState).mockReturnValue({
        settings: { basicFunctionalityEnabled: false },
      } as ReturnType<typeof store.getState>);

      assetsControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(AssetsController);
      const constructorCall = controllerMock.mock.calls[0][0];
      const isBasicFunctionality = constructorCall.isBasicFunctionality as
        | (() => boolean)
        | undefined;
      expect(isBasicFunctionality).toBeDefined();
      expect(isBasicFunctionality?.()).toBe(false);
    });
  });
});
