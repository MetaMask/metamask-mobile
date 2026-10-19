import { Hex } from '@metamask/utils';

import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionAccountOverride } from './useTransactionAccountOverride';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

/**
 * Address of the account that signs and pays for the transaction.
 *
 * For most flows this is `txParams.from`. Money Account deposits are signed by
 * the money account but funded by the account in `accountOverride`. In withdraw
 * (post-quote) flows the override is only the recipient and never signs.
 */
export function useTransactionPayingAccount(): Hex | undefined {
  const transactionMeta = useTransactionMetadataRequest();
  const accountOverride = useTransactionAccountOverride();

  const from = transactionMeta?.txParams?.from as Hex | undefined;

  if (isTransactionPayWithdraw(transactionMeta)) {
    return from;
  }

  return accountOverride ?? from;
}
