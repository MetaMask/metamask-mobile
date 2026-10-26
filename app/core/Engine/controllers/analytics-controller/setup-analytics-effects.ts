import type { AccountsControllerState } from '@metamask/accounts-controller';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { analytics } from '../../../../util/analytics/analytics';
import Logger from '../../../../util/Logger';
import { getAccountCompositionTraits } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import { BRAZE_EVENT_BLOCKLIST_FLAG_KEY } from '../../../../selectors/featureFlagController/brazeEventBlocklist';
import { syncBrazeEventBlocklist } from '../../../Braze';
import type { AnalyticsControllerInitMessenger } from '../../messengers/analytics-controller-messenger';

type InternalAccounts = AccountsControllerState['internalAccounts']['accounts'];

/**
 * Produces a stable string fingerprint from only the fields that affect wallet
 * composition metrics. Fields like `lastSelected` and account names are
 * intentionally excluded so that account switches and renames do not trigger
 * an unnecessary identify call.
 *
 * @param accounts - Internal accounts from AccountsController.
 * @returns A sorted fingerprint of keyring type and entropy.
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
 * Mobile-only analytics side effects that `@metamask/wallet` does not install.
 *
 * Wallet 19 constructs `AnalyticsController`. These subscriptions stay in the
 * app: Braze blocklist sync from remote flags, and account-composition traits.
 *
 * @param initMessenger - Messenger scoped to the remote-flag and accounts events.
 */
export function setupAnalyticsControllerEffects(
  initMessenger: AnalyticsControllerInitMessenger,
): void {
  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    ({ remoteFeatureFlags }) => {
      syncBrazeEventBlocklist(
        remoteFeatureFlags[BRAZE_EVENT_BLOCKLIST_FLAG_KEY],
      );
    },
  );

  const remoteFeatureFlagState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );
  syncBrazeEventBlocklist(
    remoteFeatureFlagState?.remoteFeatureFlags?.[
      BRAZE_EVENT_BLOCKLIST_FLAG_KEY
    ],
  );

  let lastCompositionFingerprint = '';
  initMessenger.subscribe(
    'AccountsController:stateChange',
    (accounts: InternalAccounts) => {
      const fingerprint = getCompositionFingerprint(accounts);
      if (fingerprint === lastCompositionFingerprint) return;
      try {
        analytics.identify(getAccountCompositionTraits(accounts));
        lastCompositionFingerprint = fingerprint;
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'setupAnalyticsControllerEffects: Error updating account composition traits',
        );
      }
    },
    (accountsState) => accountsState.internalAccounts.accounts,
  );
}
