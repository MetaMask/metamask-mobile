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
import { selectDepositLimits } from '../../../../../selectors/featureFlagController/confirmations';

function formatUsdAmount(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export function useTransactionDepositLimitAlert({
  pendingAmount,
}: {
  pendingAmount?: string;
} = {}): Alert[] {
  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const depositLimits = useSelector(selectDepositLimits);

  const depositLimit = useMemo(() => {
    for (const [type, limit] of Object.entries(depositLimits)) {
      if (hasTransactionType(transactionMeta, [type as TransactionType])) {
        return limit;
      }
    }
    return undefined;
  }, [transactionMeta, depositLimits]);

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

    const title = strings('alert_system.deposit_limit.title', {
      amount: formatUsdAmount(depositLimit),
    });

    return [
      {
        key: AlertKeys.DepositLimit,
        field: RowAlertKey.Amount,
        title,
        message: title,
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [exceedsLimit, depositLimit]);
}
