import { useMemo } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayAvailableTokens } from '../pay/useTransactionPayAvailableTokens';
import { hasTransactionType } from '../../utils/transaction';

export function useAccountNoTokensAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { hasTokens } = useTransactionPayAvailableTokens();

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  return useMemo(() => {
    if (!isMoneyAccountDeposit || hasTokens) {
      return [];
    }

    return [
      {
        key: AlertKeys.AccountNoFunds,
        title: strings('confirm.custom_amount.insufficient_funds'),
        message: strings('alert_system.account_no_funds.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isMoneyAccountDeposit, hasTokens]);
}
