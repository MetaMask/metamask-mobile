import { useMemo } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayAvailableTokens } from '../pay/useTransactionPayAvailableTokens';
import { hasTransactionType } from '../../utils/transaction';
import { useIsFiatPaymentAvailable } from '../pay/useIsFiatPaymentAvailable';
import { useIsTransactionPayLoading } from '../pay/useTransactionPayData';

export function useAccountNoFundsAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { hasTokens } = useTransactionPayAvailableTokens();
  const isFiatAvailable = useIsFiatPaymentAvailable();
  const isLoading = useIsTransactionPayLoading();

  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  return useMemo(() => {
    if (!isMoneyAccountDeposit || hasTokens || isFiatAvailable || isLoading) {
      return [];
    }

    return [
      {
        key: AlertKeys.AccountNoFunds,
        title: strings('alert_system.account_no_funds.title'),
        message: strings('alert_system.account_no_funds.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [isMoneyAccountDeposit, hasTokens, isFiatAvailable, isLoading]);
}
