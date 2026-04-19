import { MessengerClientInitFunction } from '../../types';
import {
  AnalyticsController,
  AnalyticsControllerMessenger,
  AnalyticsControllerState,
  getDefaultAnalyticsControllerState,
} from '@metamask/analytics-controller';
import { createPlatformAdapter } from './platform-adapter';
import { createPlatformAdapter as createE2EPlatformAdapter } from './platform-adapter-e2e';
import { isE2E } from '../../../../util/test/utils';
import { getBrazePlugin, syncBrazeAllowlists } from '../../../Braze';
import type { AnalyticsControllerInitMessenger } from '../../messengers/analytics-controller-messenger';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { analytics } from '../../../../util/analytics/analytics';
import { getAccountCompositionTraits } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import Logger from '../../../../util/Logger';

/**
 * Produces a stable string fingerprint from only the fields that affect wallet
 * composition metrics. Fields like `lastSelected` and account names are
 * intentionally excluded so that account switches and renames do not trigger
 * an unnecessary identify call.
 */
function getCompositionFingerprint(
  accounts: Record<string, InternalAccount>,
): string {
  return Object.entries(accounts)
    .map(([id, acct]) => {
      const keyringType = acct.metadata?.keyring?.type ?? '';
      const entropy = (
        acct.options as { entropy?: { id?: string; groupIndex?: number } }
      )?.entropy;
      return `${id}|${keyringType}|${entropy?.id ?? ''}|${entropy?.groupIndex ?? ''}`;
    })
    .sort()
    .join(';');
}

/**
 * Initialize the analytics controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.analyticsId - The analytics ID to use.
 * @param request.persistedState - The persisted state for all controllers.
 * @param request.initMessenger - The init messenger for remote feature flag subscriptions.
 * @returns The initialized controller.
 */
export const analyticsControllerInit: MessengerClientInitFunction<
  AnalyticsController,
  AnalyticsControllerMessenger,
  AnalyticsControllerInitMessenger
> = ({ controllerMessenger, analyticsId, persistedState, initMessenger }) => {
  const persistedAnalyticsState = persistedState.AnalyticsController;
  const defaultState = getDefaultAnalyticsControllerState();

  const state: AnalyticsControllerState = {
    optedIn: persistedAnalyticsState?.optedIn ?? defaultState.optedIn,
    analyticsId,
  };

  const platformAdapter = isE2E
    ? createE2EPlatformAdapter()
    : createPlatformAdapter([getBrazePlugin()]);

  const controller = new AnalyticsController({
    messenger: controllerMessenger,
    state,
    platformAdapter,
    isAnonymousEventsFeatureEnabled: true,
  });

  controller.init();

  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    syncBrazeAllowlists,
    (flagState) => flagState.remoteFeatureFlags.brazeSegmentForwarding,
  );

  let lastCompositionFingerprint = '';
  initMessenger.subscribe(
    'AccountsController:stateChange',
    (accounts) => {
      const fingerprint = getCompositionFingerprint(accounts);
      if (fingerprint === lastCompositionFingerprint) return;
      lastCompositionFingerprint = fingerprint;
      try {
        analytics.identify(getAccountCompositionTraits(accounts));
      } catch (error) {
        Logger.error(
          error as Error,
          'analyticsControllerInit: Error updating account composition traits',
        );
      }
    },
    (state) => state.internalAccounts.accounts,
  );

  const remoteFeatureFlagControllerState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );

  syncBrazeAllowlists(
    remoteFeatureFlagControllerState.remoteFeatureFlags.brazeSegmentForwarding,
  );

  return {
    controller,
  };
};
