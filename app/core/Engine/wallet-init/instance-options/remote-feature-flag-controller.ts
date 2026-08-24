import {
  ClientConfigApiService,
  ClientType,
} from '@metamask/remote-feature-flag-controller';
import { AuthenticationController } from '@metamask/profile-sync-controller';
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

type RemoteFeatureFlagControllerInstanceOptions =
  WalletOptions['instanceOptions']['remoteFeatureFlagController'];

/**
 * Resolves a messenger action lazily. `Wallet.init()` runs before messenger
 * clients (Analytics / Authentication) are registered, so the first call may
 * throw; later fetch-time calls succeed.
 *
 * @param messenger - Root messenger.
 * @param action - Messenger action name.
 * @returns The action result, or `undefined` when the handler is missing.
 */
function callMessengerAction<Result>(
  messenger: RootMessenger,
  action: string,
): Result | undefined {
  try {
    return messenger.call(action as never) as Result;
  } catch {
    return undefined;
  }
}

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
    clientConfigApiService: new ClientConfigApiService({
      fetch,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
    }),
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
      callMessengerAction<{ analyticsId?: string }>(
        messenger,
        'AnalyticsController:getState',
      )?.analyticsId,
    getCanonicalProfileId: () => {
      const authState =
        callMessengerAction<AuthenticationController.AuthenticationControllerState>(
          messenger,
          'AuthenticationController:getState',
        );

      return (
        Object.entries(authState?.srpSessionData ?? {})?.[0]?.[1]?.profile
          ?.canonicalProfileId ?? ''
      );
    },
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
