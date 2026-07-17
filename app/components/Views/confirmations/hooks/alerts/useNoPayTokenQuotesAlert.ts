import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import {
  useIsTransactionPayLoading,
  useTransactionPayFiatPayment,
  useTransactionPayIsMaxAmount,
  useTransactionPayIsPostQuote,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  PAY_TOKEN_REQUIRED_TRANSACTION_TYPES,
  QUOTE_REQUIRED_TRANSACTION_TYPES,
} from '../../constants/confirmations';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayWithdraw } from '../pay/useTransactionPayWithdraw';

export function useNoPayTokenQuotesAlert() {
  const { payToken } = useTransactionPayToken();
  const fiatPayment = useTransactionPayFiatPayment();
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const requiredTokens = useTransactionPayRequiredTokens();
  const isPostQuote = useTransactionPayIsPostQuote();
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const transactionMeta = useTransactionMetadataRequest();
  const { canSelectWithdrawToken } = useTransactionPayWithdraw();

  const fiatAmount = Number(fiatPayment?.amountFiat);
  const hasValidFiatAmount = Number.isFinite(fiatAmount) && fiatAmount > 0;
  const hasSelectedFiatPaymentMethod = Boolean(
    fiatPayment?.selectedPaymentMethodId,
  );

  // For non-post-quote flows, sourceAmount.targetTokenAddress refers to a
  // required token address, so matching against `requiredTokens` is valid.
  // For post-quote flows (perps/predict/moneyAccount withdraw, musdConversion),
  // sourceAmount.targetTokenAddress is the destination token address, so this
  // lookup is meaningless and can false-match a skipped gas token across
  // chains (e.g. destination native ETH `0x0…0` vs. Arbitrum native gas
  // `0x0…0`). See issue #29297.
  const isOptionalOnly =
    !isPostQuote &&
    (sourceAmounts ?? []).every(
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
    !fiatPayment?.rampsQuote &&
    quotes?.length === 0;

  // Post-quote flows (e.g. money account withdraw) where `sourceAmounts` is
  // non-empty but no quote was returned. The non-fiat branch above may not
  // fire, so we also emit the alert when the user has entered a positive
  // input amount but no quote is available.
  const hasPositiveRequiredAmount = (requiredTokens ?? []).some(
    (t) =>
      !t.skipIfBalance &&
      (isMaxAmount || (Boolean(t.amountRaw) && t.amountRaw !== '0')),
  );

  const shouldShowPostQuoteNoQuotesAlert =
    isPostQuote &&
    Boolean(payToken) &&
    !isQuotesLoading &&
    sourceAmounts?.length &&
    !quotes?.length &&
    hasPositiveRequiredAmount;

  const shouldShowQuoteRequiredNoQuotesAlert =
    hasTransactionType(transactionMeta, QUOTE_REQUIRED_TRANSACTION_TYPES) &&
    !isQuotesLoading &&
    !quotes?.length &&
    hasPositiveRequiredAmount;

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

  const showAlert =
    shouldShowNonFiatNoQuotesAlert ||
    shouldShowFiatNoQuotesAlert ||
    shouldShowPostQuoteNoQuotesAlert ||
    shouldShowQuoteRequiredNoQuotesAlert ||
    shouldShowWithdrawNotInitialisedAlert ||
    shouldShowPayTokenNotSelectedAlert;

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
