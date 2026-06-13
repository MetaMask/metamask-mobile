import { createSelector } from 'reselect';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectInternalEvmAccounts } from '../accountsController';

/**
 * A temporary mock selector that returns the first EVM account as the Money Account.
 *
 * TODO: Replace with the real MoneyAccountController selector once MUL-1647 is complete.
 */
export const selectMoneyAccount = createSelector(
  selectInternalEvmAccounts,
  (evmAccounts): InternalAccount | undefined => evmAccounts[0],
);
