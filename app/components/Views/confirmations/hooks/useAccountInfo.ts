import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import useAddressBalance from '../../../../components/hooks/useAddressBalance/useAddressBalance';
import {
  selectInternalAccounts,
  selectInternalAccountsById,
} from '../../../../selectors/accountsController';
import {
  selectAccountToWalletMap,
  selectWalletsMap,
  selectAccountGroups,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { renderAccountName, toChecksumAddress } from '../../../../util/address';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';

const useAccountInfo = (address: string, chainId: Hex) => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const accountToWalletMap = useSelector(selectAccountToWalletMap);
  const walletsMap = useSelector(selectWalletsMap);
  const accountGroups = useSelector(selectAccountGroups);
  const activeAddress = toChecksumAddress(address as Hex);
  const { addressBalance: accountBalance } = useAddressBalance(
    undefined,
    address,
    false,
    chainId,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const balance = Engine.getTotalEvmFiatAccountBalance();
  const accountFiatBalance = `${formatWithThreshold(
    balance.tokenFiat,
    0,
    I18n.locale,
    {
      style: 'currency',
      currency: currentCurrency.toUpperCase(),
    },
  )}`;

  // This refers to the internal account name, not the account group name
  // TODO: Deprecate this value to not be used in the app, use the accountGroupName instead
  const accountName = useMemo(
    () =>
      activeAddress ? renderAccountName(activeAddress, internalAccounts) : '',
    [internalAccounts, activeAddress],
  );

  const walletName = useMemo(() => {
    if (!walletsMap || !activeAddress || Object.keys(walletsMap).length <= 1) {
      return undefined;
    }

    const accountId = Object.keys(internalAccountsById).find(
      (id) =>
        internalAccountsById[id].address.toLowerCase() ===
        activeAddress.toLowerCase(),
    );

    if (!accountId) {
      return undefined;
    }

    const walletId = accountToWalletMap[accountId];
    const wallet = walletsMap[walletId];

    return wallet?.metadata?.name;
  }, [walletsMap, activeAddress, internalAccountsById, accountToWalletMap]);

  const accountGroupName = useMemo(() => {
    if (!activeAddress) {
      return undefined;
    }

    const accountGroupNames = accountGroups.reduce(
      (acc, group) => {
        group.accounts.forEach((accountId) => {
          const account = internalAccountsById[accountId];
          if (account) {
            acc[account.address.toLowerCase()] = group.metadata.name;
          }
        });
        return acc;
      },
      {} as Record<string, string>,
    );

    return accountGroupNames[activeAddress.toLowerCase()];
  }, [activeAddress, accountGroups, internalAccountsById]);

  return {
    accountName,
    accountAddress: activeAddress,
    accountBalance,
    accountFiatBalance,
    walletName,
    accountGroupName,
  };
};

export default useAccountInfo;
