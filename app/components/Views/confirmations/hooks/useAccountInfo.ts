import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import useAddressBalance from '../../../../components/hooks/useAddressBalance/useAddressBalance';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { renderAccountName, toChecksumAddress } from '../../../../util/address';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';

const useAccountInfo = (address: string, chainId: Hex) => {
  const internalAccounts = useSelector(selectInternalAccounts);
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

  const accountName = useMemo(
    () =>
      activeAddress ? renderAccountName(activeAddress, internalAccounts) : '',
    [internalAccounts, activeAddress],
  );

  return {
    accountName,
    accountAddress: activeAddress,
    accountBalance,
    accountFiatBalance,
  };
};

export default useAccountInfo;
