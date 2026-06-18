import {
  ClientConfigApiService,
  ClientType,
} from '@metamask/remote-feature-flag-controller';
import type { Json } from '@metamask/utils';
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
  state: Record<string, Record<string, Json> | undefined>;
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
    getMetaMetricsId: () =>
      messenger.call('AnalyticsController:getState').analyticsId,
    clientVersion: getBaseSemVerVersion(),
    prevClientVersion:
      typeof state?.AppMetadataController?.currentAppVersion === 'string'
        ? state.AppMetadataController.currentAppVersion
        : undefined,
    // Initial value only; runtime toggling + the startup fetch live in Engine.
    disabled: !selectBasicFunctionalityEnabled(store.getState()),
  };
}
