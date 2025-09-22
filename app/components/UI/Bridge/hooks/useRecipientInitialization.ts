import { useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAccounts } from '../../../hooks/useAccounts';
import {
  selectDestAddress,
  setDestAddress,
  selectIsEvmToSolana,
  selectIsSolanaToEvm,
} from '../../../../core/redux/slices/bridge';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { selectValidDestInternalAccountIds } from '../../../../selectors/bridge';
import {
  selectAccountGroups,
  selectSelectedAccountGroup,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
import { isNonEvmAddress } from '../../../../core/Multichain/utils';

export const useRecipientInitialization = (
  hasInitializedRecipient: React.MutableRefObject<boolean>,
) => {
  const dispatch = useDispatch();
  const { accounts } = useAccounts();
  const currentlySelectedAccount = useSelector(selectSelectedAccountGroup);

  // Filter accounts using BIP-44 aware multichain selectors via account IDs
  const validDestIds = useSelector(selectValidDestInternalAccountIds);
  const accountGroups = useSelector(selectAccountGroups);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const filteredAccounts = useMemo(() => {
    if (!validDestIds || validDestIds.size === 0) return [];
    return accounts
      .filter((account) => validDestIds.has(account.id))
      .map((account) => {
        // Use account group name if available, otherwise use account name
        let accountName = account.name;
        if (isMultichainAccountsState2Enabled) {
          const accountGroup = accountGroups.find((group) =>
            group.accounts.includes(account.id),
          );
          accountName = accountGroup?.metadata.name || account.name;
        }
        return {
          ...account,
          name: accountName,
        };
      });
  }, [
    accounts,
    validDestIds,
    accountGroups,
    isMultichainAccountsState2Enabled,
  ]);

  const destAddress = useSelector(selectDestAddress);
  const isEvmToSolana = useSelector(selectIsEvmToSolana);
  const isSolanaToEvm = useSelector(selectIsSolanaToEvm);

  const handleSelectAccount = useCallback(
    (caipAccountId: CaipAccountId | undefined) => {
      const address = caipAccountId
        ? parseCaipAccountId(caipAccountId).address
        : undefined;
      dispatch(setDestAddress(address));
    },
    [dispatch],
  );

  // Initialize default recipient account
  useEffect(() => {
    // Only initialize if we haven't done so before, or if the current address doesn't match the network type
    if (filteredAccounts.length === 0) {
      return;
    }

    // Check if current destAddress matches the network type
    const doesDestAddrMatchNetworkType =
      !destAddress ||
      (!isSolanaToEvm && !isEvmToSolana) ||
      (isSolanaToEvm && !isNonEvmAddress(destAddress)) || // Solana→EVM: address should be EVM
      (isEvmToSolana && isNonEvmAddress(destAddress)); // EVM→Solana: address should be Solana

    // Only initialize in these specific cases:
    // 1. Never initialized AND no destAddress set
    // 2. destAddress doesn't match the current network type (user switched networks)
    const shouldInitialize =
      (!hasInitializedRecipient.current && !destAddress) ||
      !doesDestAddrMatchNetworkType;

    if (shouldInitialize) {
      // Find an account from the currently selected account group that supports the destination network
      let defaultAccount = filteredAccounts[0]; // fallback to first account
      if (currentlySelectedAccount && filteredAccounts.length > 0) {
        const accountFromCurrentGroup = filteredAccounts.find((account) =>
          currentlySelectedAccount.accounts.includes(account.id),
        );

        if (accountFromCurrentGroup) {
          defaultAccount = accountFromCurrentGroup;
        }
      }

      handleSelectAccount(defaultAccount.caipAccountId);
      hasInitializedRecipient.current = true;
    }
  }, [
    destAddress,
    isEvmToSolana,
    isSolanaToEvm,
    filteredAccounts,
    handleSelectAccount,
    currentlySelectedAccount,
    hasInitializedRecipient,
  ]);
};
