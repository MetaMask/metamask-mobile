import { createSelector } from 'reselect';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';

/** Lowercase EVM address for identity-safe Perps cache comparisons. */
export const selectPerpsSelectedAccountAddress = createSelector(
  selectSelectedAccountGroupEvmInternalAccount,
  (account): string | undefined => account?.address.toLowerCase(),
);
