import { isEvmAccountType } from '@metamask/keyring-api';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectInternalAccountsById,
  selectInternalEvmAccounts,
} from '../../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectEVMEnabledNetworks } from '../../../../selectors/networkEnablementController';
import { selectAllAccountGroupIconSeedAddresses } from '../../../../selectors/multichainAccounts/accounts';
import { selectVisibleAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/manageAccounts';
import { useGetFormattedTokensPerChain } from '../../../hooks/useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../../../hooks/useGetTotalFiatBalanceCrossChains';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import { renderShortAddress } from '../../../../util/address';

export interface LinkableSocialAccount {
  id: string;
  name: string;
  address: string;
  balanceLabel: string;
}

const accountLabel = (name: string | undefined, address: string): string =>
  name?.trim() ? name : renderShortAddress(address);

/**
 * Accounts a social profile can link, named the same way as the homepage
 * account selector (the account-group name, not the raw address).
 *
 * Each row still resolves to its EVM account so the profile can link
 * `eip155:1:{address}`. Groups with no EVM account are left out.
 */
export const useLinkableSocialAccounts = (): LinkableSocialAccount[] => {
  const evmAccounts = useSelector(selectInternalEvmAccounts);
  const accountsById = useSelector(selectInternalAccountsById);
  const accountSections = useSelector(selectVisibleAccountGroupsByWallet);
  const seedAddressByGroupId = useSelector(
    selectAllAccountGroupIconSeedAddresses,
  );
  const enabledChains = useSelector(selectEVMEnabledNetworks);
  const currency = useSelector(selectCurrentCurrency);
  const formattedTokens = useGetFormattedTokensPerChain(
    evmAccounts,
    true,
    enabledChains,
  );
  const totals = useGetTotalFiatBalanceCrossChains(
    evmAccounts,
    formattedTokens,
  );

  return useMemo(() => {
    const currencyCode = (currency || 'usd').toUpperCase();
    const balanceLabelFor = (address: string): string => {
      const fiat = totals[address]?.totalFiatBalance;
      return typeof fiat === 'number'
        ? formatWithThreshold(fiat, 0.01, I18n.locale, {
            style: 'currency',
            currency: currencyCode,
          })
        : '';
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
        return [
          {
            id: account.id,
            name:
              groupName || accountLabel(account.metadata.name, account.address),
            address: account.address,
            balanceLabel: balanceLabelFor(account.address),
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
      balanceLabel: balanceLabelFor(account.address),
    }));
  }, [
    accountSections,
    accountsById,
    currency,
    evmAccounts,
    seedAddressByGroupId,
    totals,
  ]);
};
