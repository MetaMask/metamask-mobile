import { useQuery } from '@tanstack/react-query';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { predictQueries } from '../../../../UI/Predict/queries';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useHasInsufficientBalance } from '../useHasInsufficientBalance';
import { getTokenTransferData } from '../../utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../utils/transaction';

/**
 * Checks whether the gas station can pay a Predict Safe withdraw in pUSD.
 *
 * Before signing, the withdraw confirmation holds an unsigned `pUSD.transfer`
 * from the EOA, which holds no pUSD. Its simulation reverts, so
 * `transactionMeta.gasFeeTokens` is always empty and can't show whether the
 * gas station can pay. This hook asks Predict to quote gas fee tokens for the
 * real Safe call instead.
 *
 * The check runs only for a Predict withdraw with a forced gas fee token (Safe
 * accounts) and a native balance that can't cover gas. Deposit-wallet
 * withdraws have no gas fee token because the relayer pays.
 *
 * @returns `isPending` while the check runs, and `isUnavailable` when pUSD
 * can't pay the withdraw gas.
 */
export function usePredictWithdrawGasFeeToken(): {
  isPending: boolean;
  isUnavailable: boolean;
} {
  const transactionMeta = useTransactionMetadataRequest();
  const { hasInsufficientBalance } = useHasInsufficientBalance();

  const address = transactionMeta?.txParams?.from ?? '';
  const transferData = transactionMeta
    ? getTokenTransferData(transactionMeta)?.data
    : undefined;
  const amountRaw =
    parseStandardTokenTransactionData(transferData)?.args?._value?.toString() ??
    '0';

  const isEnabled =
    hasTransactionType(transactionMeta, [TransactionType.predictWithdraw]) &&
    Boolean(transactionMeta?.selectedGasFeeToken) &&
    Boolean(transactionMeta?.isGasFeeTokenIgnoredIfBalance) &&
    hasInsufficientBalance &&
    Boolean(address) &&
    amountRaw !== '0';

  const { data: isAvailable, isPending } = useQuery({
    ...predictQueries.withdrawGasFeeToken.options({ address, amountRaw }),
    enabled: isEnabled,
  });

  return {
    isPending: isEnabled && isPending,
    isUnavailable: isEnabled && isAvailable === false,
  };
}
