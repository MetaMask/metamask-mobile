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
import {
  getBaseSemVerVersion,
  getEffectiveAppVersion,
} from '../../../../util/version';
import AppConstants from '../../../AppConstants';
import type { RootMessenger } from '../../types';

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
      // Dev-only seed so the EUR market can be opened from Settings → Feature
      // flag override before the LaunchDarkly flag exists. It defaults off, so
      // `selectNeobankMarkets` behaves as if the flag were absent; production
      // builds never include it.
      ...(__DEV__
        ? {
            moneyMovementNeobankEur: {
              enabled: false,
              minimumVersion: '0.0.0',
              currency: 'EUR',
              // TRAM-4385 launch countries; Bulgaria is excluded.
              regions: [
                'AT',
                'BE',
                'HR',
                'CY',
                'CZ',
                'DK',
                'EE',
                'FI',
                'FR',
                'DE',
                'GR',
                'HU',
                'IS',
                'IE',
                'IT',
                'LV',
                'LI',
                'LT',
                'LU',
                'MT',
                'NL',
                'NO',
                'PL',
                'PT',
                'RO',
                'SK',
                'SI',
                'ES',
                'SE',
              ],
              layout: 'Sepa',
            },
          }
        : {}),
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
    clientVersion: getEffectiveAppVersion(),
    fetchInterval: __DEV__
      ? 1000
      : AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
    prevClientVersion: getPrevClientVersion(
      state?.AppMetadataController?.currentAppVersion,
    ),
    // Initial value only (set once at construction); the startup fetch lives
    // in Engine. `selectBasicFunctionalityEnabled` reads Redux settings, not
    // wallet `state`.
    disabled: !selectBasicFunctionalityEnabled(store.getState()),
  };
}

/**
 * `AppMetadataController` persists the native app version, which an OTA
 * hotfix does not change. When it still matches the current native version,
 * map it to the effective (OTA-aware) version so the controller does not see
 * a version change, and drop its flag cache, on every launch.
 *
 * @param persistedAppVersion - `AppMetadataController.currentAppVersion`.
 * @returns The previous client version to compare against `clientVersion`.
 */
function getPrevClientVersion(
  persistedAppVersion: unknown,
): string | undefined {
  if (typeof persistedAppVersion !== 'string') {
    return undefined;
  }

  return persistedAppVersion === getBaseSemVerVersion()
    ? getEffectiveAppVersion()
    : persistedAppVersion;
}
