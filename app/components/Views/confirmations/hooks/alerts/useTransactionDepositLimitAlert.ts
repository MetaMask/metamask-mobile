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

export function useTransactionDepositLimitAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;

  const depositType = useMemo(() => {
    if (
      hasTransactionType(transactionMeta, [TransactionType.moneyAccountDeposit])
    ) {
      return TransactionType.moneyAccountDeposit;
    }
    return undefined;
  }, [transactionMeta]);

  const depositLimit = useSelector((state: RootState) =>
    depositType ? selectDepositLimit(state, depositType) : undefined,
  );

  const exceedsLimit = useMemo(() => {
    if (depositLimit === undefined) {
      return false;
    }

    const amount = Number(pendingAmount ?? '0');
    return amount > depositLimit;
  }, [depositLimit, pendingAmount]);

  return useMemo(() => {
    if (!exceedsLimit || depositLimit === undefined) {
      return [];
    }

    const title = strings('alert_system.money_account_deposit_limit.title', {
      amount: formatUsdAmount(depositLimit),
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
  }, [exceedsLimit, depositLimit]);
}
