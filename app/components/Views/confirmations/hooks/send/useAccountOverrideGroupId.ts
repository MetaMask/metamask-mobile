import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { AccountGroupId } from '@metamask/account-api';
import { selectInternalAccountsById } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';

/**
 * Resolves the account group of the transaction's pay account override.
 *
 * @returns The override account's group id, or undefined when no override is
 * active or the address cannot be resolved to a known account group.
 */
export function useAccountOverrideGroupId(): AccountGroupId | undefined {
  const accountOverride = useTransactionAccountOverride();
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);

  return useMemo(() => {
    if (!accountOverride) return undefined;

    const internalAccountId = Object.keys(internalAccountsById).find(
      (id) =>
        internalAccountsById[id].address.toLowerCase() ===
        accountOverride.toLowerCase(),
    );

    if (!internalAccountId) return undefined;

    return accountToGroupMap[internalAccountId]?.id;
  }, [accountOverride, internalAccountsById, accountToGroupMap]);
}
