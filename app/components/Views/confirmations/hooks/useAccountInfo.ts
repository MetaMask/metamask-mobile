import { toChecksumAddress } from 'ethereumjs-util';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import useAddressBalance from '../../../../components/hooks/useAddressBalance/useAddressBalance';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { renderAccountName } from '../../../../util/address';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';

const useAccountInfo = (address: string) => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(address);
  const { addressBalance: accountBalance } = useAddressBalance(
    undefined,
    address,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const balance = Engine.getTotalFiatAccountBalance();
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
