import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { selectDepositLimit } from '../../../../../selectors/featureFlagController/confirmations';
import { RootState } from '../../../../../reducers';

function formatUsdAmount(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export function useMoneyAccountDepositLimitAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const moneyAccountDepositLimit = useSelector((state: RootState) =>
    selectDepositLimit(state, 'moneyAccountDeposit'),
  );

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const exceedsLimit = useMemo(() => {
    if (!isMoneyAccountDeposit || moneyAccountDepositLimit === undefined) {
      return false;
    }

    const amount = Number(pendingAmount ?? '0');
    return amount > moneyAccountDepositLimit;
  }, [isMoneyAccountDeposit, moneyAccountDepositLimit, pendingAmount]);

  return useMemo(() => {
    if (!exceedsLimit || moneyAccountDepositLimit === undefined) {
      return [];
    }

    const title = strings('alert_system.money_account_deposit_limit.title', {
      amount: formatUsdAmount(moneyAccountDepositLimit),
    });

    return [
      {
        key: AlertKeys.MoneyAccountDepositLimit,
        field: RowAlertKey.Amount,
        title,
        message: title,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [exceedsLimit, moneyAccountDepositLimit]);
}
