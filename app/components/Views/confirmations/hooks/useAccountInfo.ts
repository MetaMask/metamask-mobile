import { toChecksumAddress } from '@ethereumjs/util';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import useAddressBalance from '../../../../components/hooks/useAddressBalance/useAddressBalance';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { renderAccountName } from '../../../../util/address';

const useAccountInfo = (address: string) => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(address);
  const { addressBalance: accountBalance } = useAddressBalance(
    undefined,
    address,
  );

  const accountName = useMemo(
    () =>
      activeAddress ? renderAccountName(activeAddress, internalAccounts) : '',
    [internalAccounts, activeAddress],
  );

  return { accountName, accountAddress: activeAddress, accountBalance };
};

export default useAccountInfo;
