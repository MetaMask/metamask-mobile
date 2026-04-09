import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTokenAmount } from '../useTokenAmount';
import { hasTransactionType } from '../../utils/transaction';
import {
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import type { RootState } from '../../../../../reducers';

export function useInsufficientPerpsBalanceAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { amountPrecise } = useTokenAmount();
  const amountHuman = pendingAmount ?? amountPrecise ?? '0';
  const totals = useTransactionPayTotals();
  const quotes = useTransactionPayQuotes();
  const hasQuotes = Boolean(quotes?.length);

  const availableBalance = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.PerpsController?.accountState
        ?.availableBalance,
  );

  const isPerpsWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
  ]);

  const isPendingInput = pendingAmount !== undefined;

  const isInsufficient = useMemo(() => {
    if (!isPerpsWithdraw) return false;

    if (
      availableBalance !== undefined &&
      availableBalance !== null &&
      new BigNumber(availableBalance).isLessThan(amountHuman)
    ) {
      return true;
    }

    // On the confirmation screen (not while typing), check if fees
    // exceed the withdraw amount — user would receive nothing.
    // Skipped during input because totals may be stale.
    if (
      !isPendingInput &&
      hasQuotes &&
      totals?.fees &&
      new BigNumber(amountHuman).isGreaterThan(0)
    ) {
      const totalFees = new BigNumber(totals.fees.provider?.usd ?? 0)
        .plus(totals.fees.sourceNetwork?.estimate?.usd ?? 0)
        .plus(totals.fees.targetNetwork?.usd ?? 0)
        .plus(totals.fees.metaMask?.usd ?? 0);

      if (totalFees.isGreaterThanOrEqualTo(amountHuman)) {
        return true;
      }
    }

    return false;
  }, [
    amountHuman,
    hasQuotes,
    isPendingInput,
    isPerpsWithdraw,
    availableBalance,
    totals,
  ]);

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPerpsBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}
