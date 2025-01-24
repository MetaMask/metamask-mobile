import { toChecksumAddress } from 'ethereumjs-util';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import Engine from '../../../../core/Engine';
import useAddressBalance from '../../../../components/hooks/useAddressBalance/useAddressBalance';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { renderAccountName } from '../../../../util/address';
import { renderFiat } from '../../../../util/number';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

const useAccountInfo = (address: string) => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(address);
  const { addressBalance: accountBalance } = useAddressBalance(
    undefined,
    address,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const balance = Engine.getTotalFiatAccountBalance();
  const accountFiatBalance = `${renderFiat(
    balance.tokenFiat,
    currentCurrency,
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
