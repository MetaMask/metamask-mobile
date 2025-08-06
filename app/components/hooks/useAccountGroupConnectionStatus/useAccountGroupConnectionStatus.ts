import { useSelector } from 'react-redux';

import {
  Caip25CaveatValue,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import {
  CaipAccountId,
  CaipChainId,
  CaipNamespace,
  isCaipNamespace,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import { useMemo } from 'react';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import {
  AccountGroupWithInternalAccounts,
  selectAccountGroupWithInternalAccounts,
  selectCaip25AccountIdToMultichainAccountGroupMap,
  selectMultichainAccountGroupsByScopes,
} from '../../../selectors/multichainAccounts/accounts';

export const useAccountGroupConnectionStatus = (
  existingPermission: Caip25CaveatValue,
  requestedCaipChainIds: CaipChainId[] | CaipNamespace[],
) => {
  const accountGroups = useSelector(selectAccountGroupWithInternalAccounts);

  const caip25ToAccountGroupMap = useSelector(
    selectCaip25AccountIdToMultichainAccountGroupMap,
  );

  // Extract EVM chains for selector
  const deduplicatedEvmChains = useMemo(
    () =>
      Array.from(
        new Set(
          requestedCaipChainIds.map((chainId: string) => {
            let namespace: string;
            if (isCaipNamespace(chainId)) {
              namespace = chainId;
            } else {
              namespace = parseCaipChainId(chainId).namespace;
            }
            console.log('namespace', namespace);
            return namespace.startsWith(KnownCaipNamespace.Eip155)
              ? `${KnownCaipNamespace.Eip155}:0`
              : chainId;
          }),
        ),
      ),
    [requestedCaipChainIds],
  );

  console.log('deduplicatedEvmChains', deduplicatedEvmChains);
  console.log('accountGroups', accountGroups);

  const supportedAccountGroups = useSelector((state) =>
    selectMultichainAccountGroupsByScopes(state, deduplicatedEvmChains),
  );

  const { connectedAccountGroups, connectedCaipAccountIds } = useMemo(() => {
    // need to convert all eip155 chain ids to wildcard
    const connectedAccountIds =
      getCaipAccountIdsFromCaip25CaveatValue(existingPermission);

    const connectedAccountGroupsSet =
      new Set<AccountGroupWithInternalAccounts>();

    connectedAccountIds.forEach((caipAccountId) => {
      const {
        address,
        chain: { namespace },
      } = parseCaipAccountId(caipAccountId);

      const caip25IdToUse: CaipAccountId =
        namespace === KnownCaipNamespace.Eip155
          ? `${KnownCaipNamespace.Eip155}:0:${address}`
          : caipAccountId;

      const accountGroupId: AccountGroupObject['id'] | undefined =
        caip25ToAccountGroupMap.get(caip25IdToUse);

      if (accountGroupId) {
        const accountGroup = accountGroups.find(
          (group) => group.id === accountGroupId,
        );
        if (accountGroup) {
          connectedAccountGroupsSet.add(accountGroup);
        }
      }
    });

    return {
      connectedAccountGroups: Array.from(connectedAccountGroupsSet),
      connectedCaipAccountIds: connectedAccountIds,
    };
  }, [existingPermission, accountGroups, caip25ToAccountGroupMap]);

  return {
    connectedAccountGroups,
    supportedAccountGroups,
    existingConnectedCaipAccountIds: connectedCaipAccountIds,
  };
};
