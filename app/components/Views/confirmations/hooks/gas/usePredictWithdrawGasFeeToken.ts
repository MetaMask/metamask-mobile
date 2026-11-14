import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { predictQueries } from '../../../../UI/Predict/queries';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useHasInsufficientBalance } from '../useHasInsufficientBalance';
import { getTokenTransferData } from '../../utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { selectUseTransactionSimulations } from '../../../../../selectors/preferencesController';

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
 * withdraws have no gas fee token because the relayer pays. It also respects
 * the transaction simulations setting, like the TransactionController's own
 * gas fee token lookup.
 *
 * If the check fails (for example, an RPC error while building the Safe
 * call), the hook returns unavailable. The check can't show that pUSD pays,
 * and native balance is short, so `checkGasFeeTokenBeforePublish` would fail
 * the withdraw with `Gas fee token not found and insufficient native balance`
 * after the user signs. Remounting the confirmation checks again.
 *
 * A cached `true` can be up to 30 seconds old, and gas prices or the Safe
 * balance can change before the user confirms. `recheck` runs the check
 * again, ignoring the cache, so confirm can use a fresh result.
 *
 * @returns `isPending` while the check runs, `isUnavailable` when pUSD
 * can't pay the withdraw gas, and `recheck` to run the check again before
 * confirming. `recheck` resolves `true` when the withdraw can go ahead.
 */
export function usePredictWithdrawGasFeeToken(): {
  isPending: boolean;
  isUnavailable: boolean;
  recheck: () => Promise<boolean>;
} {
  const queryClient = useQueryClient();
  const transactionMeta = useTransactionMetadataRequest();
  const { hasInsufficientBalance } = useHasInsufficientBalance();
  const isSimulationEnabled = useSelector(selectUseTransactionSimulations);

  const address = transactionMeta?.txParams?.from ?? '';
  const transferData = transactionMeta
    ? getTokenTransferData(transactionMeta)?.data
    : undefined;
  const amountRaw =
    parseStandardTokenTransactionData(transferData)?.args?._value?.toString() ??
    '0';

  const isEnabled =
    isSimulationEnabled &&
    hasTransactionType(transactionMeta, [TransactionType.predictWithdraw]) &&
    Boolean(transactionMeta?.selectedGasFeeToken) &&
    Boolean(transactionMeta?.isGasFeeTokenIgnoredIfBalance) &&
    hasInsufficientBalance &&
    Boolean(address) &&
    amountRaw !== '0';

  const {
    data: isAvailable,
    isError,
    isPending,
    isFetching,
  } = useQuery({
    ...predictQueries.withdrawGasFeeToken.options({ address, amountRaw }),
    enabled: isEnabled,
  });

  const recheck = useCallback(async () => {
    if (!isEnabled) {
      return true;
    }

    // A failed check leaves the query in its error state, so the hook
    // reports unavailable and the alert shows.
    return queryClient
      .query({
        ...predictQueries.withdrawGasFeeToken.options({ address, amountRaw }),
        staleTime: 0,
      })
      .catch(() => false);
  }, [address, amountRaw, isEnabled, queryClient]);

  // Treat a refetch as pending, so a cached `false` doesn't show the alert
  // while it is being checked again.
  return {
    isPending: isEnabled && (isPending || isFetching),
    isUnavailable:
      isEnabled && (isAvailable === false || isError) && !isFetching,
    recheck,
  };
}
