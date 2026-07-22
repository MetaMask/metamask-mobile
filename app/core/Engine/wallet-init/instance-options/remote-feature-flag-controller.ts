import {
  ClientConfigApiService,
  ClientType,
} from '@metamask/remote-feature-flag-controller';
import type { WalletOptions } from '@metamask/wallet';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../../controllers/remote-feature-flag-controller';
import { getBaseSemVerVersion } from '../../../../util/version';
import { getDefaultFeatureFlags } from '../../../../constants/featureFlags';
import AppConstants from '../../../AppConstants';
import type { RootMessenger } from '../../types';

type RemoteFeatureFlagControllerInstanceOptions =
  WalletOptions['instanceOptions']['remoteFeatureFlagController'];

type ClientConfigApiServiceOption =
  RemoteFeatureFlagControllerInstanceOptions['clientConfigApiService'];

/**
 * Wrap a `ClientConfigApiService` so fetched flags always have the client-side
 * defaults merged UNDER them. Because the controller replaces
 * `remoteFeatureFlags` wholesale on each successful fetch, this keeps defaults
 * as a durable fallback for flags the server never returns. Explicit server
 * values still win over defaults.
 *
 * @param service - The underlying client config API service to delegate to.
 * @returns A service that merges defaults under the fetched flags.
 */
function withDefaultFeatureFlags(
  service: ClientConfigApiService,
): ClientConfigApiServiceOption {
  return {
    onBreak: service.onBreak.bind(service),
    onDegraded: service.onDegraded.bind(service),
    async fetchRemoteFeatureFlags() {
      const response = await service.fetchRemoteFeatureFlags();
      return {
        ...response,
        remoteFeatureFlags: {
          ...getDefaultFeatureFlags(),
          ...response.remoteFeatureFlags,
        },
      };
    },
  };
}

/**
 * @param options.messenger - Root messenger; resolves the MetaMetrics id from
 * `AnalyticsController` lazily at fetch time.
 * @param options.state - Initial wallet state; `prevClientVersion` is read from
 * the persisted `AppMetadataController` so the controller can invalidate cached
 * flags when the client version changes between sessions.
 */
export function getRemoteFeatureFlagControllerInstanceOptions({
  messenger,
  state,
}: {
  messenger: RootMessenger;
  state: NonNullable<WalletOptions['state']>;
}): RemoteFeatureFlagControllerInstanceOptions {
  return {
    clientConfigApiService: withDefaultFeatureFlags(
      new ClientConfigApiService({
        fetch,
        config: {
          client: ClientType.Mobile,
          environment: getFeatureFlagAppEnvironment(),
          distribution: getFeatureFlagAppDistribution(),
        },
      }),
    ),
    getMetaMetricsId: () =>
      messenger.call('AnalyticsController:getState').analyticsId,
    clientVersion: getBaseSemVerVersion(),
    fetchInterval: __DEV__
      ? 1000
      : AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
    prevClientVersion:
      typeof state?.AppMetadataController?.currentAppVersion === 'string'
        ? state.AppMetadataController.currentAppVersion
        : undefined,
    // Initial value only (set once at construction); the startup fetch lives
    // in Engine. `selectBasicFunctionalityEnabled` reads Redux settings, not
    // wallet `state`.
    disabled: !selectBasicFunctionalityEnabled(store.getState()),
  };
}
