import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
  remoteFeatureFlagControllerInit,
} from './remote-feature-flag-controller-init';
import {
  ClientConfigApiService,
  DistributionType,
  EnvironmentType,
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
    const { controller } = remoteFeatureFlagControllerInit(
      getInitRequestMock(),
    );

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

describe('getFeatureFlagAppEnvironment', () => {
  const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

  afterAll(() => {
    process.env.METAMASK_ENVIRONMENT = originalMetamaskEnvironment;
  });

  it('returns EnvironmentType.Production when METAMASK_ENVIRONMENT is production', () => {
    process.env.METAMASK_ENVIRONMENT = 'production';
    expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Production);
  });

  it('returns EnvironmentType.Beta when METAMASK_ENVIRONMENT is beta', () => {
    process.env.METAMASK_ENVIRONMENT = 'beta';
    expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Beta);
  });

  // TODO: Remove this test case once pre-release env is removed
  it('returns EnvironmentType.ReleaseCandidate when METAMASK_ENVIRONMENT is pre-release', () => {
    process.env.METAMASK_ENVIRONMENT = 'pre-release';
    expect(getFeatureFlagAppEnvironment()).toBe(
      EnvironmentType.ReleaseCandidate,
    );
  });

  it('returns EnvironmentType.ReleaseCandidate when METAMASK_ENVIRONMENT is rc', () => {
    process.env.METAMASK_ENVIRONMENT = 'rc';
    expect(getFeatureFlagAppEnvironment()).toBe(
      EnvironmentType.ReleaseCandidate,
    );
  });

  it('returns EnvironmentType.Test when METAMASK_ENVIRONMENT is test', () => {
    process.env.METAMASK_ENVIRONMENT = 'test';
    expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Test);
  });

  it('returns EnvironmentType.Exp when METAMASK_ENVIRONMENT is exp', () => {
    process.env.METAMASK_ENVIRONMENT = 'exp';
    expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Exp);
  });

  it('returns EnvironmentType.Development when METAMASK_ENVIRONMENT is dev', () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Development);
  });

  it('returns EnvironmentType.Development when METAMASK_ENVIRONMENT is not set', () => {
    process.env.METAMASK_ENVIRONMENT = '';
    expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Development);
  });
});

describe('getFeatureFlagAppDistribution', () => {
  const originalMetamaskBuildType = process.env.METAMASK_BUILD_TYPE;

  afterAll(() => {
    process.env.METAMASK_BUILD_TYPE = originalMetamaskBuildType;
  });

  it('returns DistributionType.Main when METAMASK_BUILD_TYPE is main', () => {
    process.env.METAMASK_BUILD_TYPE = 'main';
    expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Main);
  });

  it('returns DistributionType.Flask when METAMASK_BUILD_TYPE is flask', () => {
    process.env.METAMASK_BUILD_TYPE = 'flask';
    expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Flask);
  });

  it('returns DistributionType.Main when METAMASK_BUILD_TYPE is not set', () => {
    process.env.METAMASK_BUILD_TYPE = '';
    expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Main);
  });
});
