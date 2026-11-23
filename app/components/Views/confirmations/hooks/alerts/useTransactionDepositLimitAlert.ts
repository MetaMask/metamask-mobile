import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectDepositLimits } from '../../../../../selectors/featureFlagController/confirmations';
import { useConfirmationContext } from '../../context/confirmation-context';

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
  const { pendingFiatAmount } = useConfirmationContext();

  // The cap blocks the keypad before the amount is ever committed, so with no
  // explicit argument fall back to the amount the user is typing. Without this
  // the alert is inactive at exactly the moment it blocks them, and never
  // reaches the confirmation alert context or its metrics.
  const effectiveAmount = pendingAmount ?? pendingFiatAmount;

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

    const amount = Number(effectiveAmount ?? '0');
    return Number.isFinite(amount) && amount > depositLimit;
  }, [depositLimit, effectiveAmount]);

  return useMemo(() => {
    if (!exceedsLimit || depositLimit === undefined) {
      return NO_ALERTS;
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
