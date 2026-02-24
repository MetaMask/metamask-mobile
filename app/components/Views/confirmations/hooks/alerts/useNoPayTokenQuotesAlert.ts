import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { TransactionType } from '@metamask/transaction-controller';

export function useNoPayTokenQuotesAlert() {
  const { payToken } = useTransactionPayToken();
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const requiredTokens = useTransactionPayRequiredTokens();
  const transactionMetadata = useTransactionMetadataRequest();

  const isOptionalOnly = (sourceAmounts ?? []).every(
    (t) =>
      requiredTokens?.find((rt) => rt.address === t.targetTokenAddress)
        ?.skipIfBalance,
  );

  const showAlert =
    payToken &&
    !isQuotesLoading &&
    sourceAmounts?.length &&
    !quotes?.length &&
    !isOptionalOnly;

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    const baseAlert = {
      key: AlertKeys.NoPayTokenQuotes,
      field: RowAlertKey.PayWith,
      message: strings('alert_system.no_pay_token_quotes.message'),
      title: strings('alert_system.no_pay_token_quotes.title'),
      severity: Severity.Danger,
      isBlocking: true,
    };

    if (
      hasTransactionType(transactionMetadata, [TransactionType.musdConversion])
    ) {
      baseAlert.message = strings(
        'alert_system.no_pay_token_quotes_musd_conversion.message',
      );
      baseAlert.title = strings(
        'alert_system.no_pay_token_quotes_musd_conversion.title',
      );
    }

    return [baseAlert];
  }, [showAlert, transactionMetadata]);
}
