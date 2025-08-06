import { useSelector } from 'react-redux';

import {
  Caip25CaveatValue,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import {
  CaipAccountId,
  CaipChainId,
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
  requestedCaipChainIds: CaipChainId[],
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
          requestedCaipChainIds.map((chainId) => {
            const { namespace } = parseCaipChainId(chainId);
            return namespace.startsWith(KnownCaipNamespace.Eip155)
              ? `${KnownCaipNamespace.Eip155}:0`
              : chainId;
          }),
        ),
      ),
    [requestedCaipChainIds],
  );

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
          connectedAccountGroups.add(accountGroup);
        }
      }
    });

    return {
      connectedAccountGroups: connectedAccountGroupsSet,
      connectedCaipAccountIds: connectedAccountIds,
    };
  }, [existingPermission, accountGroups, caip25ToAccountGroupMap]);

  return {
    connectedAccountGroups,
    supportedAccountGroups,
    existingConnectedCaipAccountIds: connectedCaipAccountIds,
  };
};
