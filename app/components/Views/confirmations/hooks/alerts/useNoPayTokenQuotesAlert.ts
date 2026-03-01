import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import {
  useTransactionPayFiatPayment,
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';

export function useNoPayTokenQuotesAlert() {
  const { payToken } = useTransactionPayToken();
  const fiatPayment = useTransactionPayFiatPayment();
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const requiredTokens = useTransactionPayRequiredTokens();
  const fiatAmount = Number(fiatPayment?.amount);
  const hasValidFiatAmount = Number.isFinite(fiatAmount) && fiatAmount > 0;
  const hasSelectedFiatPaymentMethod = Boolean(
    fiatPayment?.selectedPaymentMethodId,
  );

  const isOptionalOnly = (sourceAmounts ?? []).every(
    (t) =>
      requiredTokens?.find((rt) => rt.address === t.targetTokenAddress)
        ?.skipIfBalance,
  );

  const shouldShowNonFiatNoQuotesAlert =
    payToken &&
    !isQuotesLoading &&
    sourceAmounts?.length &&
    !quotes?.length &&
    !isOptionalOnly;

  const shouldShowFiatNoQuotesAlert =
    hasSelectedFiatPaymentMethod &&
    hasValidFiatAmount &&
    !isQuotesLoading &&
    sourceAmounts?.length === 0 &&
    quotes?.length === 0;

  const showAlert =
    shouldShowNonFiatNoQuotesAlert || shouldShowFiatNoQuotesAlert;

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
