import { useSelector } from 'react-redux';

import { selectInternalAccounts } from '../../../selectors/accountsController';
import { UseDisplayNameRequest } from './useDisplayName';
import { areAddressesEqual } from '../../../util/address';

export function useInternalAccountNames(requests: UseDisplayNameRequest[]) {
  const internalAccounts = useSelector(selectInternalAccounts);

  return requests.map((request) => {
    const { value } = request;
    const foundAccount = internalAccounts.find((account) =>
      areAddressesEqual(account.address, value),
    );
    return foundAccount?.metadata?.name;
  });
}
