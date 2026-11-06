import type { AccountsControllerState } from '@metamask/accounts-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import { syncBrazeEventBlocklist } from '../../../Braze';
import { BRAZE_EVENT_BLOCKLIST_FLAG_KEY } from '../../../../selectors/featureFlagController/brazeEventBlocklist';
import { analytics } from '../../../../util/analytics/analytics';
import { getAccountCompositionTraits } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import Logger from '../../../../util/Logger';
import type { AnalyticsControllerInitMessenger } from '../messengers/analytics-controller-messenger';

type InternalAccounts = AccountsControllerState['internalAccounts']['accounts'];

/**
 * Produces a stable string fingerprint from only the fields that affect wallet
 * composition metrics. Fields like `lastSelected` and account names are
 * intentionally excluded so that account switches and renames do not trigger
 * an unnecessary identify call.
 *
 * @param accounts - The internal accounts.
 * @returns The composition fingerprint.
 */
function getCompositionFingerprint(accounts: InternalAccounts): string {
  return Object.entries(accounts)
    .map(([id, acct]) => {
      const keyringType = acct.metadata?.keyring?.type ?? '';
      const entropy: InternalAccount['options']['entropy'] =
        acct.options?.entropy;
      const isMnemonic =
        entropy?.type === KeyringAccountEntropyTypeOption.Mnemonic &&
        !!entropy.id &&
        entropy.groupIndex !== undefined;
      const entropyId = isMnemonic ? entropy.id : '';
      const entropyGroupIndex = isMnemonic ? entropy.groupIndex : '';
      return `${id}|${keyringType}|${entropy?.type ?? ''}|${entropyId}|${entropyGroupIndex}`;
    })
    .sort((a, b) => a.localeCompare(b))
    .join(';');
}

/**
 * Sets up the mobile listeners for the wallet-owned AnalyticsController:
 * syncs the Braze event blocklist from remote feature flags and identifies
 * the user with account composition traits when accounts change.
 *
 * @param messenger - The AnalyticsController init messenger.
 */
export function setupAnalyticsControllerListeners(
  messenger: AnalyticsControllerInitMessenger,
): void {
  messenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    ({ remoteFeatureFlags }) => {
      syncBrazeEventBlocklist(
        remoteFeatureFlags[BRAZE_EVENT_BLOCKLIST_FLAG_KEY],
      );
    },
  );

  const remoteFeatureFlagState = messenger.call(
    'RemoteFeatureFlagController:getState',
  );
  syncBrazeEventBlocklist(
    remoteFeatureFlagState?.remoteFeatureFlags?.[
      BRAZE_EVENT_BLOCKLIST_FLAG_KEY
    ],
  );

  let lastCompositionFingerprint = '';
  messenger.subscribe(
    'AccountsController:stateChange',
    (accounts: InternalAccounts) => {
      const fingerprint = getCompositionFingerprint(accounts);
      if (fingerprint === lastCompositionFingerprint) return;
      try {
        analytics.identify(getAccountCompositionTraits(accounts));
        lastCompositionFingerprint = fingerprint;
      } catch (error) {
        Logger.error(
          error as Error,
          'setupAnalyticsControllerListeners: Error updating account composition traits',
        );
      }
    },
    (accountsState) => accountsState.internalAccounts.accounts,
  );
}
