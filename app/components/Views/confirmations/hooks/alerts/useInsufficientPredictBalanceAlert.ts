import { useMemo } from 'react';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTokenAmount } from '../useTokenAmount';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';
import {
  useTransactionPayQuotes,
  useTransactionPayTotals,
} from '../pay/useTransactionPayData';
import { getTotalPayFeesUsd } from '../../utils/transaction-pay';

export function useInsufficientPredictBalanceAlert({
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

  const { data: predictBalanceHuman = 0 } = usePredictBalance();

  const isPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);

  const isPendingInput = pendingAmount !== undefined;

  const isInsufficient = useMemo(() => {
    if (!isPredictWithdraw) return false;

    if (new BigNumber(predictBalanceHuman ?? '0').isLessThan(amountHuman)) {
      return true;
    }

    // Predict withdraws are EXACT_INPUT: fees are deducted from the receive
    // amount, never added on top of the entered amount. Only guard against
    // fees consuming the entire withdrawal.
    if (
      !isPendingInput &&
      hasQuotes &&
      totals?.fees &&
      new BigNumber(amountHuman).isGreaterThan(0)
    ) {
      if (getTotalPayFeesUsd(totals.fees).isGreaterThanOrEqualTo(amountHuman)) {
        return true;
      }
    }

    return false;
  }, [
    amountHuman,
    hasQuotes,
    isPendingInput,
    isPredictWithdraw,
    predictBalanceHuman,
    totals,
  ]);

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPredictBalance,
        field: RowAlertKey.Amount,
        title: strings('alert_system.insufficient_pay_token_balance.message'),
        message: strings(
          'alert_system.insufficient_pay_method_balance.message',
        ),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}
