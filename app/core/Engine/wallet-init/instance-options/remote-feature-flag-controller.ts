import {
  ClientConfigApiService,
  ClientType,
  DistributionType,
  EnvironmentType,
  type FeatureFlags,
} from '@metamask/remote-feature-flag-controller';
import type { WalletOptions } from '@metamask/wallet';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../../controllers/remote-feature-flag-controller';
import { getBaseSemVerVersion } from '../../../../util/version';
import AppConstants from '../../../AppConstants';
import type { RootMessenger } from '../../types';


const REMOTE_FEATURE_FLAG_FETCH_INTERVAL = 15 * 60 * 1000;

/**
 * Local simulation of a remote flag transition for
 * `networkAssetsSnapsMigrationStellar`. The first fetch is enabled (`stage` 1).
 * Each later forced fetch flips the stage and publishes
 * `RemoteFeatureFlagController:stateChange`.
 *
 * Active only in development builds. Remove this once the stateChange check is done.
 */
const SIMULATE_STELLAR_MIGRATION_FLAG_TRANSITION =
  process.env.NODE_ENV === 'development';

const STELLAR_MIGRATION_FLAG = 'networkAssetsSnapsMigrationStellar';

/** How often the simulated flag flips after the first fetch. */
const SIMULATED_FLIP_INTERVAL_MS = 30_000;

/**
 * Resolved `networkAssetsSnapsMigrationStellar` value.
 *
 * This is the shape stored in `remoteFeatureFlags` after version gating.
 * `AccountsApiDataSource` only runs its `stateChange` handler when
 * `parseSnapsAssetsMigrationStage` changes, and that parser reads `stage` here
 * (or under `value`). A `versions` wrapper that does not resolve parses as
 * stage 0 both times, so the handler never runs.
 *
 * @param stage - Rollout stage. Fetches alternate between `1` (enabled) and `0` (disabled).
 * @returns The feature flag value subscribers read.
 */
function stellarMigrationFlag(stage: 0 | 1): FeatureFlags[string] {
  return {
    featureVersion: '1',
    minimumSnapVersion: '1.20.0',
    stage,
  };
}

type MetaMaskBuildType = 'flask' | 'main' | 'beta' | 'experimental';

const BUILD_TYPE_MAPPING: Record<MetaMaskBuildType, DistributionType> = {
  flask: DistributionType.Flask,
  main: DistributionType.Main,
  beta: DistributionType.Beta,
  // Experimental builds use main distribution.
  experimental: DistributionType.Main,
};

const ENVIRONMENT_MAPPING: Partial<
  Record<MetaMaskBuildEnvironment, EnvironmentType>
> = {
  ['development']: EnvironmentType.Development,
  ['release-candidate']: EnvironmentType.ReleaseCandidate,
  ['production']: EnvironmentType.Production,
};


/**
 * Derive the distribution and environment the remote feature flag service
 * should request for, from the build-time environment variables.
 *
 * @returns The distribution and environment for the client config request.
 */
export function getConfigForRemoteFeatureFlagRequest() {

  const buildType = process.env.METAMASK_BUILD_TYPE;

  const distribution =
    BUILD_TYPE_MAPPING[buildType as MetaMaskBuildType] || DistributionType.Main;

  let environment =
    ENVIRONMENT_MAPPING[
      process.env.METAMASK_ENVIRONMENT as MetaMaskBuildEnvironment
    ] || EnvironmentType.Development;

  if (buildType === 'experimental') {
    environment = EnvironmentType.Exp;
  }

  return { distribution, environment };
}

/**
 * Client config service that serves `networkAssetsSnapsMigrationStellar` as
 * enabled, then flips it every 30 seconds. Other flags still come from the real
 * client-config response when that request succeeds.
 *
 * The first successful fetch starts the flip interval. On a new install that
 * fetch is the one triggered when onboarding completes.
 *
 * @param messenger - Root messenger used to force each follow-up fetch.
 * @returns A client config service the controller can fetch through.
 */
export function createStellarMigrationFlagTransitionService(
  messenger: WalletInitMessenger,
): RemoteFeatureFlagControllerInstanceOptions['clientConfigApiService'] {
  const realService = getRemoteFeatureFlagClientConfigApiService();
  let enabled = true;
  let flipIntervalStarted = false;

  const forceUpdate = () => {
    // `updateRemoteFeatureFlags` returns before fetching while the controller
    // is disabled, so no stateChange is published. Enable it first, and drop a
    // persisted local override that would hide the stage change.
    try {
      messenger.call('RemoteFeatureFlagController:enable');
    } catch (error: unknown) {
      console.error(
        'Failed to enable remote feature flag controller for simulation:',
        error,
      );
    }
    try {
      messenger.call(
        'RemoteFeatureFlagController:removeFlagOverride',
        STELLAR_MIGRATION_FLAG,
      );
    } catch (error: unknown) {
      console.error('Failed to clear stellar migration flag override:', error);
    }
    messenger
      .call('RemoteFeatureFlagController:updateRemoteFeatureFlags', true)
      .catch((error: unknown) => {
        console.error(
          'Failed to simulate remote feature flag state change:',
          error,
        );
      });
  };

  return {
    async fetchRemoteFeatureFlags() {
      const stage = enabled ? 1 : 0;
     // enabled = !enabled;

      let remoteFeatureFlags: FeatureFlags = {};
      try {
        const response = await realService.fetchRemoteFeatureFlags();
        remoteFeatureFlags = response.remoteFeatureFlags;
      } catch (error: unknown) {
        console.error(
          'Remote feature flag fetch failed; simulating the stellar migration flag only:',
          error,
        );
      }

      // if (!flipIntervalStarted) {
      //   flipIntervalStarted = true;
      //   setInterval(forceUpdate, SIMULATED_FLIP_INTERVAL_MS);
      // }

      console.info(
        `[remote-feature-flag simulation] ${stage === 1 ? 'enabled' : 'disabled'} (stage ${stage})`,
      );

      return {
        remoteFeatureFlags: {
          ...remoteFeatureFlags,
          [STELLAR_MIGRATION_FLAG]: stellarMigrationFlag(stage),
        },
        cacheTimestamp: Date.now(),
      };
    },
  };
}

const getRemoteFeatureFlagClientConfigApiService = () => {
  return new ClientConfigApiService({
    fetch,
    config: {
      client: ClientType.Mobile,
      environment: getFeatureFlagAppEnvironment(),
      distribution: getFeatureFlagAppDistribution(),
    },
  })
}
``
type RemoteFeatureFlagControllerInstanceOptions =
  WalletOptions['instanceOptions']['remoteFeatureFlagController'];

/**
 * @param options.messenger - Root messenger; resolves the MetaMetrics id and
 * canonical profile id lazily at fetch / init time.
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
    clientConfigApiService: SIMULATE_STELLAR_MIGRATION_FLAG_TRANSITION
    ? createStellarMigrationFlagTransitionService(messenger)
    : getRemoteFeatureFlagClientConfigApiService(),
    
    // Apply default feature flag values here.
    defaultFeatureFlags: {
      // Example:
      // 'feature-flag-name': true,
    },
    // Flags that are used in flows prior to authentication should be added here.
    metaMetricsFlags: [
      // Example:
      // 'feature-flag-name',
    ],
    getMetaMetricsId: () =>
      messenger.call('AnalyticsController:getState').analyticsId,
    getCanonicalProfileId: () => {
      const { srpSessionData } = messenger.call(
        'AuthenticationController:getState',
      );

      return (
        Object.entries(srpSessionData ?? {})?.[0]?.[1]?.profile
          ?.canonicalProfileId ?? ''
      );
    },
    clientVersion: getBaseSemVerVersion(),
    fetchInterval: REMOTE_FEATURE_FLAG_FETCH_INTERVAL,
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
