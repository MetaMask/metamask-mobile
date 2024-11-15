import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../selectors/accountsController';
import useEnsNameByAddress from '../../components/hooks/useEnsNameByAddress';
import { isDefaultAccountName } from '../../util/ENSUtils';

export const useAccountName = () => {
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const { ensName } = useEnsNameByAddress(selectedAccount?.address);
  const defaultName = selectedAccount?.metadata?.name;

  return useMemo(
    () =>
      (isDefaultAccountName(defaultName) && ensName ? ensName : defaultName) ||
      '',
    [defaultName, ensName],
  );
};
