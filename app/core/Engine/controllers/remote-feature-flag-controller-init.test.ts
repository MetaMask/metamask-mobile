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
import { buildTimeDefaultsConfig } from './remote-feature-flag-build-time-defaults-config';

jest.mock('./remote-feature-flag-build-time-defaults-config', () => ({
  buildTimeDefaultsConfig: {
    shouldApply: jest.fn(),
  },
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ...jest.requireActual('@metamask/remote-feature-flag-controller'),
  RemoteFeatureFlagController: jest.fn().mockImplementation(() => ({
    updateRemoteFeatureFlags: jest.fn().mockResolvedValue(undefined),
  })),
}));

function getInitRequestMock(
  overrides?: Partial<{
    persistedState: ControllerInitRequest<RemoteFeatureFlagControllerMessenger>['persistedState'];
    __testRemoteFeatureFlagDefaultsJson?: string;
  }>,
): jest.Mocked<ControllerInitRequest<RemoteFeatureFlagControllerMessenger>> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getRemoteFeatureFlagControllerMessenger(baseMessenger),
    initMessenger: undefined,
    ...overrides,
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
      state: undefined,
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

  describe('build-time feature flag defaults (builds.yml)', () => {
    const originalGithubActions = process.env.GITHUB_ACTIONS;
    const originalE2E = process.env.E2E;
    const originalRemoteFeatureFlagDefaults =
      process.env.REMOTE_FEATURE_FLAG_DEFAULTS;

    beforeEach(() => {
      jest.mocked(RemoteFeatureFlagController).mockClear();
    });

    afterEach(() => {
      jest.mocked(buildTimeDefaultsConfig.shouldApply).mockReset();
      if (originalGithubActions !== undefined) {
        process.env.GITHUB_ACTIONS = originalGithubActions;
      } else {
        delete process.env.GITHUB_ACTIONS;
      }
      if (originalE2E !== undefined) {
        process.env.E2E = originalE2E;
      } else {
        delete process.env.E2E;
      }
      if (originalRemoteFeatureFlagDefaults !== undefined) {
        process.env.REMOTE_FEATURE_FLAG_DEFAULTS =
          originalRemoteFeatureFlagDefaults;
      } else {
        delete process.env.REMOTE_FEATURE_FLAG_DEFAULTS;
      }
    });

    it('passes persisted state as-is when not in GitHub Actions', () => {
      jest.mocked(buildTimeDefaultsConfig.shouldApply).mockReturnValue(false);
      process.env.GITHUB_ACTIONS = 'false';
      delete process.env.E2E;
      delete process.env.REMOTE_FEATURE_FLAG_DEFAULTS;

      const persistedState = {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: { customFlag: true },
        },
      };
      remoteFeatureFlagControllerInit(
        getInitRequestMock({
          persistedState,
        } as Parameters<typeof getInitRequestMock>[0]),
      );

      const controllerMock = jest.mocked(RemoteFeatureFlagController);
      expect(controllerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          state: persistedState.RemoteFeatureFlagController,
        }),
      );
    });

    it('merges REMOTE_FEATURE_FLAG_DEFAULTS when GITHUB_ACTIONS is true and E2E is not set', () => {
      jest.mocked(buildTimeDefaultsConfig.shouldApply).mockReturnValue(true);

      remoteFeatureFlagControllerInit(
        getInitRequestMock({
          __testRemoteFeatureFlagDefaultsJson: JSON.stringify({
            perpsPerpTradingEnabled: true,
            earnPooledStakingEnabled: false,
          }),
        } as Parameters<typeof getInitRequestMock>[0]),
      );

      const controllerMock = jest.mocked(RemoteFeatureFlagController);
      const callArg = controllerMock.mock.calls[0][0];
      expect(callArg.state).toBeDefined();
      expect(callArg.state?.remoteFeatureFlags).toMatchObject({
        perpsPerpTradingEnabled: true,
        earnPooledStakingEnabled: false,
      });
    });

    it('passes persisted state as-is when GITHUB_ACTIONS is true and E2E is true', () => {
      jest.mocked(buildTimeDefaultsConfig.shouldApply).mockReturnValue(false);
      process.env.GITHUB_ACTIONS = 'true';
      process.env.E2E = 'true';
      process.env.REMOTE_FEATURE_FLAG_DEFAULTS = JSON.stringify({
        perpsPerpTradingEnabled: true,
      });

      remoteFeatureFlagControllerInit(getInitRequestMock());

      const controllerMock = jest.mocked(RemoteFeatureFlagController);
      expect(controllerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          state: undefined,
        }),
      );
    });

    it('persisted state overrides build-time defaults when both present', () => {
      jest.mocked(buildTimeDefaultsConfig.shouldApply).mockReturnValue(true);

      const persistedState = {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            perpsPerpTradingEnabled: true,
          },
        },
      };
      remoteFeatureFlagControllerInit(
        getInitRequestMock({
          persistedState,
          __testRemoteFeatureFlagDefaultsJson: JSON.stringify({
            perpsPerpTradingEnabled: false,
            earnPooledStakingEnabled: true,
          }),
        } as Parameters<typeof getInitRequestMock>[0]),
      );

      const controllerMock = jest.mocked(RemoteFeatureFlagController);
      const callArg = controllerMock.mock.calls[0][0];
      expect(callArg.state?.remoteFeatureFlags).toMatchObject({
        perpsPerpTradingEnabled: true,
        earnPooledStakingEnabled: true,
      });
    });
  });
});
