import { createSelector } from 'reselect';
import type { AccountTreeControllerState } from '@metamask/account-tree-controller';
import type { AccountGroupBalance } from '@metamask/assets-controller';
import { toHex } from '@metamask/controller-utils';
import {
  KnownCaipNamespace,
  parseCaipChainId,
  type CaipChainId,
} from '@metamask/utils';
import { selectAssetsControllerStateForBalances } from '../../../selectors/assets/assets-controller';
import { getUnifiedBalanceForAccountGroup } from '../../../selectors/assets/balances';
import { selectAccountTreeControllerState } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';

type EnabledNetworkMap = Record<string, Record<string, boolean>>;

/**
 * Same network filter the homepage balance uses. Popular chain ids win so a
 * network that is popular still counts when it is not in the enabled map.
 */
const enabledNetworkMapFor = (
  popularChainIds: CaipChainId[] | undefined,
  enabledNetworksByNamespace: EnabledNetworkMap | undefined,
): EnabledNetworkMap => {
  if (!popularChainIds?.length) {
    return enabledNetworksByNamespace ?? {};
  }
  const map: EnabledNetworkMap = {};
  for (const caipChainId of popularChainIds) {
    const { namespace, reference } = parseCaipChainId(caipChainId);
    if (namespace === KnownCaipNamespace.Eip155) {
      if (!map.eip155) {
        map.eip155 = {};
      }
      map.eip155[toHex(reference)] = true;
    } else {
      if (!map[namespace]) {
        map[namespace] = {};
      }
      map[namespace][caipChainId] = true;
    }
  }
  return map;
};

const toAccountTreeState = (
  accountTreeControllerState: ReturnType<
    typeof selectAccountTreeControllerState
  >,
): AccountTreeControllerState =>
  ({
    accountTree: accountTreeControllerState?.accountTree,
    selectedAccountGroup:
      accountTreeControllerState?.selectedAccountGroup ?? '',
    accountGroupsMetadata:
      (
        accountTreeControllerState as {
          accountGroupsMetadata?: AccountTreeControllerState['accountGroupsMetadata'];
        }
      )?.accountGroupsMetadata ?? {},
    accountWalletsMetadata:
      (
        accountTreeControllerState as {
          accountWalletsMetadata?: AccountTreeControllerState['accountWalletsMetadata'];
        }
      )?.accountWalletsMetadata ?? {},
  }) as AccountTreeControllerState;

/**
 * Aggregated fiat balance for every account group, using the same
 * `getAggregatedBalanceForAccount` path as the homepage total.
 *
 * Shared so any screen can show the same total as the homepage. The assets
 * selector files stay unchanged.
 *
 * @param popularChainIds - Optional popular CAIP chain ids for network filtering.
 */
export const selectUnifiedBalancesByAccountGroup = (
  popularChainIds?: CaipChainId[],
) =>
  createSelector(
    [
      selectAssetsControllerStateForBalances,
      selectAccountTreeControllerState,
      selectEnabledNetworksByNamespace,
    ],
    (
      assetsControllerState,
      accountTreeControllerState,
      enabledNetworksByNamespace,
    ) => {
      const accountTreeState = toAccountTreeState(accountTreeControllerState);
      const enabledNetworkMap = enabledNetworkMapFor(
        popularChainIds,
        enabledNetworksByNamespace,
      );
      const balances: Record<string, AccountGroupBalance> = {};
      const wallets = accountTreeState.accountTree?.wallets ?? {};
      for (const wallet of Object.values(wallets)) {
        for (const groupId of Object.keys(wallet?.groups ?? {})) {
          balances[groupId] = getUnifiedBalanceForAccountGroup(
            assetsControllerState,
            accountTreeState,
            groupId,
            enabledNetworkMap,
          );
        }
      }
      return balances;
    },
  );
