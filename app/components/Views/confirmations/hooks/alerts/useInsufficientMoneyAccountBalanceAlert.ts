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
import { hasTransactionType } from '../../utils/transaction';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { useTokenAmount } from '../useTokenAmount';

export function useInsufficientMoneyAccountBalanceAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { totalFiatRaw } = useMoneyAccountBalance();
  const { amountPrecise } = useTokenAmount();
  const amountHuman = pendingAmount ?? amountPrecise ?? '0';

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);

  const isInsufficient = useMemo(() => {
    if (!isMoneyAccountWithdraw) return false;
    if (totalFiatRaw === undefined) return false;

    return new BigNumber(totalFiatRaw).isLessThan(amountHuman);
  }, [isMoneyAccountWithdraw, amountHuman, totalFiatRaw]);

  return useMemo(() => {
    if (!isInsufficient) {
      return [];
    }

    return [
      {
        key: AlertKeys.InsufficientMoneyAccountBalance,
        field: RowAlertKey.Amount,
        message: strings('alert_system.insufficient_pay_token_balance.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isInsufficient]);
}
