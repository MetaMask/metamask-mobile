import { useSelector } from 'react-redux';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';

/**
 * Whether the Money Account is available as a payment source.
 *
 * Centralises the check for the MetaMask Pay decision points that independently
 * route payment to the Money Account: the pay-with listing
 * (`usePayWithMoneyAccountSection`) and the `defaultPaySelectedSection` feature
 * flag (`useIsMoneyAccountFlagDefault`). Both decide on their own, so both
 * consult this rather than re-deriving their own rules.
 *
 * The `payWithOption` nav-param path is deliberately *not* covered here: it
 * originates from Money home, whose transfer entry point is already disabled
 * unless there is a spendable balance, so the param is a trusted signal.
 *
 * Selecting an unfunded Money Account produces a quote whose nested delegation
 * redeems against an empty (often codeless) account, which reverts during
 * simulation.
 *
 * Two cases are deliberately distinguished. Funding flows (deposits) pay *from*
 * the Money Account, so they require a confirmed positive balance. Post-quote
 * flows (`perpsWithdraw`, `predictWithdraw`, `moneyAccountWithdraw`) pay *into*
 * it, where a zero balance is expected and must not make it unavailable.
 *
 * Outside a confirmation there is no transaction metadata, which correctly
 * falls through to the stricter funding case.
 *
 * Fails closed while the balance is loading or unavailable: `withdrawableMusd`
 * is `undefined` in both cases, and an unverifiable balance cannot safely seed
 * a quote.
 */
export function usePayMoneyAccountAvailable(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { withdrawableMusd } = useMoneyAccountBalance();

  if (!moneyAccount) {
    return false;
  }

  const isFundingSource = !isTransactionPayWithdraw(transactionMeta);

  return !isFundingSource || Boolean(withdrawableMusd?.isGreaterThan(0));
}
