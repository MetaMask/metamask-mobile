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
} from '@metamask/transaction-controller';
import { useTokenAmount } from '../useTokenAmount';
import { hasTransactionType } from '../../utils/transaction';
import { usePredictBalance } from '../../../../UI/Predict/hooks/usePredictBalance';

export function useInsufficientPredictBalanceAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { amountPrecise } = useTokenAmount();
  const amountHuman = pendingAmount ?? amountPrecise ?? '0';

  const { balance: predictBalanceHuman } = usePredictBalance({
    loadOnMount: true,
  });

  const isPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);

  const isInsufficient = useMemo(
    () =>
      isPredictWithdraw &&
      new BigNumber(predictBalanceHuman ?? '0').isLessThan(amountHuman),
    [amountHuman, isPredictWithdraw, predictBalanceHuman],
  );

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientPredictBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}
