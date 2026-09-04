import { useCallback } from 'react';
import { useStore } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { selectAccountGroupHidden } from '../../../../selectors/multichainAccounts/manageAccounts';

/**
 * Toggles an account group's hidden state on the Manage Accounts screen.
 *
 * `toggleHidden` reads the group's current hidden state through the
 * `selectAccountGroupHidden` selector (fresh store state, not stale props)
 * and inverts it via the AccountTreeController.
 *
 * No manual `syncWithUserStorage()` call is made: the controller
 * auto-enqueues a single-group backup-and-sync for entropy-wallet groups.
 * `syncWithUserStorage()` performs full bi-directional reconciliation and
 * must be reserved for full reconciliation flows.
 *
 * @returns An object with the `toggleHidden` action
 */
const useToggleAccountGroupHidden = () => {
  const store = useStore();

  const toggleHidden = useCallback(
    (groupId: AccountGroupId): void => {
      const { AccountTreeController } = Engine.context;
      const isCurrentlyHidden = selectAccountGroupHidden(groupId)(
        store.getState() as RootState,
      );

      AccountTreeController.setAccountGroupHidden(groupId, !isCurrentlyHidden);
    },
    [store],
  );

  return { toggleHidden };
};

export default useToggleAccountGroupHidden;
