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

export function useNoPayTokenQuotesAlert() {
  const { payToken } = useTransactionPayToken();
  const fiatPayment = useTransactionPayFiatPayment();
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const requiredTokens = useTransactionPayRequiredTokens();
  const isPostQuote = useTransactionPayIsPostQuote();
  const isMaxAmount = useTransactionPayIsMaxAmount();

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
    sourceAmounts?.length === 0 &&
    quotes?.length === 0;

  // Post-quote flows (e.g. money account withdraw MUSD -> MUSD) can end up with
  // an empty `sourceAmounts` when the source and destination tokens match and
  // get filtered out in `calculatePostQuoteSourceAmounts`. In that case the
  // non-fiat branch above never fires, so we also emit the alert whenever the
  // user has entered a positive input amount but no quote is available.
  const hasPositiveRequiredAmount = (requiredTokens ?? []).some(
    (t) =>
      !t.skipIfBalance &&
      (isMaxAmount || (Boolean(t.amountRaw) && t.amountRaw !== '0')),
  );

  const shouldShowPostQuoteNoQuotesAlert =
    isPostQuote &&
    Boolean(payToken) &&
    !isQuotesLoading &&
    !sourceAmounts?.length &&
    !quotes?.length &&
    hasPositiveRequiredAmount;

  const showAlert =
    shouldShowNonFiatNoQuotesAlert ||
    shouldShowFiatNoQuotesAlert ||
    shouldShowPostQuoteNoQuotesAlert;

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
