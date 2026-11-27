import { useCallback } from 'react';
import { AccountGroupId } from '@metamask/account-api';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  AccountHiddenLocation,
  getAccountWalletMetricProps,
} from '../../../../core/Analytics/events/accounts';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { getAccountListStats } from '../../../../selectors/multichainAccounts/manageAccounts';

/**
 * Toggles an account group's hidden state on the Manage Accounts screen and
 * tracks `Account Hidden`.
 *
 * `toggleHidden` reads the group's current hidden state from the
 * AccountTreeController rather than Redux: the controller writes synchronously
 * but reaches the store through a batched update, so the store can still hold
 * the previous value when the same row is toggled twice in quick succession.
 * For the same reason `hidden_count_after` is counted from the controller
 * state right after the write.
 *
 * No manual `syncWithUserStorage()` call is made: the controller
 * auto-enqueues a single-group backup-and-sync for entropy-wallet groups.
 * `syncWithUserStorage()` performs full bi-directional reconciliation and
 * must be reserved for full reconciliation flows.
 *
 * @returns An object with the `toggleHidden` action
 */
const useToggleAccountGroupHidden = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();

  const toggleHidden = useCallback(
    (groupId: AccountGroupId): void => {
      const { AccountTreeController } = Engine.context;
      const wallet = Object.values(
        AccountTreeController.state.accountTree.wallets,
      ).find((candidate) => Boolean(candidate.groups[groupId]));
      const hidden = !wallet?.groups[groupId]?.metadata.hidden;

      // Throws when the group is not in the tree, so nothing is tracked for a
      // write that did not happen.
      AccountTreeController.setAccountGroupHidden(groupId, hidden);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.ACCOUNT_HIDDEN)
          .addProperties({
            ...getAccountWalletMetricProps(wallet),
            hidden,
            hidden_count_after: getAccountListStats(
              AccountTreeController.state.accountTree.wallets,
            ).hiddenCount,
            location: AccountHiddenLocation.ManageAccounts,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  return { toggleHidden };
};

export default useToggleAccountGroupHidden;
