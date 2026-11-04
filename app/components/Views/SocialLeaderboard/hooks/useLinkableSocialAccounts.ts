import { isEvmAccountType } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { CaipAccountId } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectInternalAccountsById,
  selectInternalEvmAccounts,
} from '../../../../selectors/accountsController';
import { selectBalanceForAllWalletsAndChains } from '../../../../selectors/assets/balances';
import { selectAccountToGroupMap } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAllAccountGroupIconSeedAddresses } from '../../../../selectors/multichainAccounts/accounts';
import { selectVisibleAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/manageAccounts';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import { renderShortAddress } from '../../../../util/address';

export interface LinkableSocialAccount {
  id: string;
  name: string;
  address: string;
  balanceLabel: string;
  /**
   * Every address in the account group as CAIP-10 ids (EVM, Solana, ...), so
   * the profile links the whole account rather than only its EVM address.
   */
  linkedAddresses: CaipAccountId[];
}

const accountLabel = (name: string | undefined, address: string): string =>
  name?.trim() ? name : renderShortAddress(address);

/**
 * EVM addresses keep the `eip155:1` form the profile API already stores;
 * other accounts use their first (mainnet) scope.
 */
export const toLinkedCaipAccountId = (
  account: Pick<InternalAccount, 'address' | 'type' | 'scopes'>,
): CaipAccountId | null => {
  if (isEvmAccountType(account.type)) {
    return `eip155:1:${account.address}`;
  }
  const scope = account.scopes[0];
  return scope ? (`${scope}:${account.address}` as CaipAccountId) : null;
};

/**
 * Accounts a social profile can link, named the same way as the homepage
 * account selector (the account-group name, not the raw address).
 *
 * Each row resolves to its EVM account for display and selection, and carries
 * every address in the group for `linked_addresses`. Groups with no EVM
 * account are left out.
 */
export const useLinkableSocialAccounts = (): LinkableSocialAccount[] => {
  const evmAccounts = useSelector(selectInternalEvmAccounts);
  const accountsById = useSelector(selectInternalAccountsById);
  const accountSections = useSelector(selectVisibleAccountGroupsByWallet);
  const seedAddressByGroupId = useSelector(
    selectAllAccountGroupIconSeedAddresses,
  );
  const accountsToGroupMap = useSelector(selectAccountToGroupMap);
  const allBalances = useSelector(selectBalanceForAllWalletsAndChains);

  return useMemo(() => {
    const balanceByGroupId = new Map<
      string,
      { total: number; currency: string }
    >();
    for (const wallet of Object.values(allBalances.wallets ?? {})) {
      for (const group of Object.values(wallet.groups ?? {})) {
        balanceByGroupId.set(group.groupId, {
          total: group.totalBalanceInUserCurrency,
          currency: group.userCurrency,
        });
      }
    }

    const balanceLabelFor = (groupId: string): string => {
      const balance = balanceByGroupId.get(groupId);
      if (!balance?.total || !balance.currency) {
        return '';
      }
      return formatWithThreshold(balance.total, 0.01, I18n.locale, {
        style: 'currency',
        currency: balance.currency.toUpperCase(),
      });
    };

    const accountsByAddress = new Map(
      Object.values(accountsById).map((account) => [
        account.address.toLowerCase(),
        account,
      ]),
    );
    const groupRows = accountSections.flatMap((section) =>
      section.data.flatMap((group) => {
        const seedAddress = seedAddressByGroupId[group.id];
        const account = seedAddress
          ? accountsByAddress.get(seedAddress.toLowerCase())
          : undefined;
        if (!account || !isEvmAccountType(account.type)) {
          return [];
        }
        const groupName = group.metadata.name?.trim();
        const groupAddresses = group.accounts.flatMap((accountId) => {
          const member = accountsById[accountId];
          const caipId = member ? toLinkedCaipAccountId(member) : null;
          return caipId ? [caipId] : [];
        });
        const evmCaipId = toLinkedCaipAccountId(account) as CaipAccountId;
        return [
          {
            id: account.id,
            name:
              groupName || accountLabel(account.metadata.name, account.address),
            address: account.address,
            balanceLabel: balanceLabelFor(group.id),
            linkedAddresses: [
              evmCaipId,
              ...groupAddresses.filter((id) => id !== evmCaipId),
            ],
          },
        ];
      }),
    );

    if (groupRows.length > 0) {
      return groupRows;
    }

    return evmAccounts.map((account) => ({
      id: account.id,
      name: accountLabel(account.metadata.name, account.address),
      address: account.address,
      balanceLabel: balanceLabelFor(accountsToGroupMap[account.id]?.id ?? ''),
      linkedAddresses: [`eip155:1:${account.address}` as CaipAccountId],
    }));
  }, [
    accountSections,
    accountsById,
    accountsToGroupMap,
    allBalances,
    evmAccounts,
    seedAddressByGroupId,
  ]);
};
