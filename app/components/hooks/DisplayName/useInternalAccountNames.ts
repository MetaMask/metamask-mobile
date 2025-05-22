import { useSelector } from 'react-redux';

import { selectInternalAccounts } from '../../../selectors/accountsController';
import { UseDisplayNameRequest } from './useDisplayName';

export function useInternalAccountNames(requests: UseDisplayNameRequest[]) {
  const internalAccounts = useSelector(selectInternalAccounts);

  return requests.map((request) => {
    const { value } = request;
    const foundAccount = internalAccounts.find(
      (account) => account.address.toLowerCase() === value.toLowerCase(),
    );
    return foundAccount?.metadata?.name;
  });
}
