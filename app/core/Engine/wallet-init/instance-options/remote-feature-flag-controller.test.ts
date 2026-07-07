import {
  ClientConfigApiService,
  ClientType,
} from '@metamask/remote-feature-flag-controller';
import { getRemoteFeatureFlagControllerInstanceOptions } from './remote-feature-flag-controller';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../../controllers/remote-feature-flag-controller';
import { getBaseSemVerVersion } from '../../../../util/version';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import AppConstants from '../../../AppConstants';
import type { RootMessenger } from '../../types';

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ...jest.requireActual('@metamask/remote-feature-flag-controller'),
  ClientConfigApiService: jest
    .fn()
    .mockImplementation(() => ({ name: 'mock-client-config-api-service' })),
}));

jest.mock('../../../../store', () => ({ store: { getState: jest.fn() } }));

jest.mock('../../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

function buildMessenger(analyticsId?: string) {
  return { call: jest.fn(() => ({ analyticsId })) } as unknown as RootMessenger;
}

describe('getRemoteFeatureFlagControllerInstanceOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectBasicFunctionalityEnabled).mockReturnValue(true);
  });

  it('builds a ClientConfigApiService for the mobile client', () => {
    getRemoteFeatureFlagControllerInstanceOptions({
      messenger: buildMessenger('metrics-id'),
      state: {},
    });

    expect(ClientConfigApiService).toHaveBeenCalledWith({
      fetch,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
    });
  });

  it('resolves the MetaMetrics id from AnalyticsController via the messenger', () => {
    const messenger = buildMessenger('metrics-id');
    const options = getRemoteFeatureFlagControllerInstanceOptions({
      messenger,
      state: {},
    });

    expect(options.getMetaMetricsId?.()).toBe('metrics-id');
    expect(messenger.call).toHaveBeenCalledWith('AnalyticsController:getState');
  });

  it('passes through an undefined MetaMetrics id (resolved lazily at fetch time)', () => {
    const options = getRemoteFeatureFlagControllerInstanceOptions({
      messenger: buildMessenger(undefined),
      state: {},
    });

    expect(options.getMetaMetricsId?.()).toBeUndefined();
  });

  it('reads prevClientVersion from persisted AppMetadataController state', () => {
    const options = getRemoteFeatureFlagControllerInstanceOptions({
      messenger: buildMessenger('metrics-id'),
      state: { AppMetadataController: { currentAppVersion: '1.2.2' } },
    });

    expect(options.prevClientVersion).toBe('1.2.2');
  });

  it('leaves prevClientVersion undefined when not persisted', () => {
    const options = getRemoteFeatureFlagControllerInstanceOptions({
      messenger: buildMessenger('metrics-id'),
      state: {},
    });

    expect(options.prevClientVersion).toBeUndefined();
  });

  it('ignores a non-string persisted app version', () => {
    const options = getRemoteFeatureFlagControllerInstanceOptions({
      messenger: buildMessenger('metrics-id'),
      state: { AppMetadataController: { currentAppVersion: 123 } },
    });

    expect(options.prevClientVersion).toBeUndefined();
  });

  it('derives disabled from the basic-functionality setting', () => {
    jest.mocked(selectBasicFunctionalityEnabled).mockReturnValue(false);

    const options = getRemoteFeatureFlagControllerInstanceOptions({
      messenger: buildMessenger('metrics-id'),
      state: {},
    });

    expect(options.disabled).toBe(true);
  });

  it('uses the configured client version and fetch interval', () => {
    const options = getRemoteFeatureFlagControllerInstanceOptions({
      messenger: buildMessenger('metrics-id'),
      state: {},
    });

    expect(options.clientVersion).toBe(getBaseSemVerVersion());
    // `__DEV__` is false under jest, so the production branch runs.
    expect(options.fetchInterval).toBe(
      AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
    );
  });

  it('uses a short fetch interval in development', () => {
    const globalWithDev = global as unknown as { __DEV__: boolean };
    const originalDev = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = true;

    try {
      const options = getRemoteFeatureFlagControllerInstanceOptions({
        messenger: buildMessenger('metrics-id'),
        state: {},
      });

      expect(options.fetchInterval).toBe(1000);
    } finally {
      globalWithDev.__DEV__ = originalDev;
    }
  });
});
