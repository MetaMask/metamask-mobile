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

export function useNoPayTokenQuotesAlert() {
  const { payToken } = useTransactionPayToken();
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const requiredTokens = useTransactionPayRequiredTokens();

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

    return [
      {
        key: AlertKeys.NoPayTokenQuotes,
        field: RowAlertKey.PayWith,
        message: strings('alert_system.no_pay_token_quotes.message'),
        title: strings('alert_system.no_pay_token_quotes.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [showAlert]);
}
