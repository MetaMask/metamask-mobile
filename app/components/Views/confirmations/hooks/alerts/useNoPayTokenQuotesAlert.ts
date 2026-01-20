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
  useTransactionPayIsPostQuote,
  useTransactionPaySelectedToken,
} from '../pay/useTransactionPayData';

export function useNoPayTokenQuotesAlert() {
  const { payToken } = useTransactionPayToken();
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const requiredTokens = useTransactionPayRequiredTokens();
  const isPostQuote = useTransactionPayIsPostQuote();
  const selectedToken = useTransactionPaySelectedToken();

  const isOptionalOnly = (sourceAmounts ?? []).every(
    (t) =>
      requiredTokens?.find((rt) => rt.address === t.targetTokenAddress)
        ?.skipIfBalance,
  );

  // For post-quote (withdrawal) flows, check if source and target are the same token
  // Same-token-same-chain withdrawals don't need bridging, so no quotes is expected
  const sourceToken = requiredTokens?.find((t) => !t.skipIfBalance);
  const isSameTokenWithdrawal =
    isPostQuote &&
    sourceToken &&
    selectedToken &&
    sourceToken.address.toLowerCase() === selectedToken.address.toLowerCase() &&
    sourceToken.chainId === selectedToken.chainId;

  const showAlert =
    payToken &&
    !isQuotesLoading &&
    sourceAmounts?.length &&
    !quotes?.length &&
    !isOptionalOnly &&
    !isSameTokenWithdrawal; // Don't show alert for same-token withdrawals

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
