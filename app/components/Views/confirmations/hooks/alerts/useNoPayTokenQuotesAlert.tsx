import React, { useMemo } from 'react';
import { hasTransactionType } from '@metamask/transaction-controller';

import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { NoQuoteAlert } from '../../components/alerts/no-quote-alert';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import {
  useIsTransactionPayLoading,
  useTransactionPayFiatPayment,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayQuoteError,
  useTransactionPayQuotesRaw,
  useTransactionPayRequiredTokens,
} from '../pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  QUOTE_REQUIRED_TRANSACTION_TYPES,
} from '../../constants/confirmations';
import { useTransactionPayWithdraw } from '../pay/useTransactionPayWithdraw';

export function useNoPayTokenQuotesAlert() {
  const { payToken } = useTransactionPayToken();
  const fiatPayment = useTransactionPayFiatPayment();
  const quotes = useTransactionPayQuotesRaw();
  const isQuotesLoading = useIsTransactionPayLoading();
  const requiredTokens = useTransactionPayRequiredTokens();
  const isPostQuote = useTransactionPayIsPostQuote();
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const transactionMeta = useTransactionMetadataRequest();
  const { canSelectWithdrawToken } = useTransactionPayWithdraw();
  const quoteError = useTransactionPayQuoteError();

  const fiatAmount = Number(fiatPayment?.amountFiat);
  const hasValidFiatAmount = Number.isFinite(fiatAmount) && fiatAmount > 0;
  const hasSelectedFiatPaymentMethod = Boolean(
    fiatPayment?.selectedPaymentMethodId,
  );

  // Controller-backed (not UI-local keypad state), so every hook instance sees
  // the same value. True once a positive amount has reached the controller via
  // keypad input, prefill, or Max. isMaxAmount counts because post-quote flows
  // substitute the token balance for a zero amountRaw when max is set.
  const hasPositiveRequiredAmount = (requiredTokens ?? []).some(
    (t) =>
      !t.skipIfBalance &&
      (isMaxAmount || (Boolean(t.amountRaw) && t.amountRaw !== '0')),
  );

  // Deposits set isMaxAmount synchronously (Max / uncapped 100% prefill) before
  // the debounced amount update pushes amountRaw, and a pre-quote max with a
  // zero amount never starts quote loading. Gating empty-quote branches that
  // apply to deposits on amountRaw alone — not isMaxAmount — keeps the alert
  // quiet through that in-flight window; once the amount lands amountRaw is
  // positive and a genuine no-quote case still fires.
  //
  // Do not latch on isQuotesLoading pulses to infer "settled": the pay
  // controller briefly pulses loading for an empty pre-fetch before the real
  // fetch (see useCustomAmountStage), and a latch would treat that gap as a
  // finished empty result and flash this alert again.
  const hasPositiveRequiredTokenAmount = (requiredTokens ?? []).some(
    (t) => !t.skipIfBalance && Boolean(t.amountRaw) && t.amountRaw !== '0',
  );

  const shouldShowNonFiatNoQuotesAlert =
    payToken &&
    !isQuotesLoading &&
    !quotes?.length &&
    hasPositiveRequiredTokenAmount;

  const shouldShowFiatNoQuotesAlert =
    hasSelectedFiatPaymentMethod &&
    hasValidFiatAmount &&
    !isQuotesLoading &&
    !fiatPayment?.rampsQuote &&
    quotes?.length === 0;

  const shouldShowPostQuoteNoQuotesAlert =
    isPostQuote &&
    Boolean(payToken) &&
    !isQuotesLoading &&
    !quotes?.length &&
    hasPositiveRequiredAmount;

  // Same amountRaw gate as the non-fiat branch: moneyAccountDeposit is the only
  // quote-required type, and Max sets isMaxAmount before amountRaw / loading.
  const shouldShowQuoteRequiredNoQuotesAlert =
    hasTransactionType(transactionMeta, QUOTE_REQUIRED_TRANSACTION_TYPES) &&
    !isQuotesLoading &&
    !quotes?.length &&
    hasPositiveRequiredTokenAmount;

  // Withdraws with token selection enabled must have the pay config
  // (isPostQuote) set on the controller before confirming. Blocks the
  // timing race where initialisation (e.g. Predict account state) never
  // completed. A destination token is not required here: withdraws with no
  // preferred or last-used token intentionally leave payToken unset and
  // default to a direct, same-token transfer (see getBestToken). That case
  // is safe and is not the race this alert guards against; the actual
  // conversion-pending case is covered by shouldShowPostQuoteNoQuotesAlert
  // above, which does require payToken.
  const shouldShowWithdrawNotInitialisedAlert =
    canSelectWithdrawToken &&
    !isQuotesLoading &&
    hasPositiveRequiredAmount &&
    !isPostQuote;

  // Pay-type deposits and conversions must have a payment token set on the
  // controller (or a fiat payment method selected) before confirming. Blocks
  // the timing races where auto-selection never completed, so no quotes were
  // fetched and the transaction previously submitted directly without funds.
  const shouldShowPayTokenNotSelectedAlert =
    hasTransactionType(transactionMeta, PAY_TOKEN_REQUIRED_TRANSACTION_TYPES) &&
    !isQuotesLoading &&
    hasPositiveRequiredAmount &&
    !payToken &&
    !hasSelectedFiatPaymentMethod;

  // A quote may be returned but fail validation (e.g. insufficient balance).
  // The quote still renders prices/fees, but the alert blocks confirmation and
  // surfaces the structured reason and detail rows provided by core.
  const shouldShowQuoteErrorAlert = Boolean(quoteError);

  const showAlert =
    shouldShowNonFiatNoQuotesAlert ||
    shouldShowFiatNoQuotesAlert ||
    shouldShowPostQuoteNoQuotesAlert ||
    shouldShowQuoteRequiredNoQuotesAlert ||
    shouldShowWithdrawNotInitialisedAlert ||
    shouldShowPayTokenNotSelectedAlert ||
    shouldShowQuoteErrorAlert;

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    return [
      {
        key: AlertKeys.NoPayTokenQuotes,
        field: RowAlertKey.PayWith,
        ...(quoteError
          ? {
              content: <NoQuoteAlert error={quoteError} />,
              message: quoteError.message,
            }
          : { message: strings('alert_system.no_pay_token_quotes.message') }),
        title: strings('alert_system.no_pay_token_quotes.title'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [showAlert, quoteError]);
}
