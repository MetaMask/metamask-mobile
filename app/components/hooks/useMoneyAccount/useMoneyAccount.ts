import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { selectMoneyAccount } from '../../../selectors/moneyAccount';

/**
 * A temporary mock hook that returns the first EVM account as the Money Account.
 *
 * TODO: Replace with the real MoneyAccountController hook once MUL-1647 is complete.
 */
export const useMoneyAccount = (): InternalAccount | undefined =>
  useSelector(selectMoneyAccount);
