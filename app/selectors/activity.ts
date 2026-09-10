import { createSelector } from 'reselect';
import { formatAccountToCaipAccountId } from '@metamask/perps-controller';
import { parseCaipChainId, type CaipChainId } from '@metamask/utils';
import type { RootState } from '../reducers';
import { selectSelectedAccountGroupEvmInternalAccount } from './multichainAccounts/accountTreeController';

const selectCaipChainId = (_state: RootState, caipChainId: CaipChainId) =>
  caipChainId;

export const selectSelectedAccountCaipId = createSelector(
  [selectSelectedAccountGroupEvmInternalAccount, selectCaipChainId],
  (account, caipChainId) => {
    if (!account?.address) {
      return undefined;
    }

    const { reference } = parseCaipChainId(caipChainId);
    return (
      formatAccountToCaipAccountId(account.address, reference) ?? undefined
    );
  },
);
