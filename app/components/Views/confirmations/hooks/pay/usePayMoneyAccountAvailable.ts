import { useSelector } from 'react-redux';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';

export interface PayMoneyAccountAvailability {
  isAvailable: boolean;
  /**
   * The balance is still loading. Callers that would otherwise select a
   * different payment source must wait rather than treat this as unavailable,
   * or they win the race every time.
   */
  isPending: boolean;
}

/**
 * Whether the Money Account is available as a payment source.
 *
 * Selecting an unfunded Money Account produces a quote that reverts during
 * simulation, so this fails closed.
 *
 * Only funding flows require a balance. Post-quote flows pay *into* the Money
 * Account, where a zero balance is expected and must not make it unavailable.
 *
 * @param options - Hook options.
 * @param options.enabled - Set `false` when the caller has already ruled the
 * Money Account out, to skip fetching a balance that cannot change the answer.
 */
export function usePayMoneyAccountAvailable({
  enabled = true,
}: { enabled?: boolean } = {}): PayMoneyAccountAvailability {
  const transactionMeta = useTransactionMetadataRequest();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);

  const isApplicable = enabled && Boolean(moneyAccount);
  const isFundingSource = !isTransactionPayWithdraw(transactionMeta);

  const { isBalanceLoading, withdrawableMusd } = useMoneyAccountBalance({
    enabled: isApplicable && isFundingSource,
  });

  if (!isApplicable) {
    return { isAvailable: false, isPending: false };
  }

  // Receiving flows do not spend from the account, so no balance is required.
  if (!isFundingSource) {
    return { isAvailable: true, isPending: false };
  }

  return {
    isAvailable: Boolean(withdrawableMusd?.isGreaterThan(0)),
    isPending: isBalanceLoading,
  };
}
