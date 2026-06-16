import { useCallback, useEffect, useMemo, useRef } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useRampsUserRegion } from '../../../../../UI/Ramp/hooks/useRampsUserRegion';
import { getChainIdFromAssetId } from '../../../../../UI/Ramp/headless/useHeadlessBuy';
import type {
  AnalyticsEvents,
  RampSurface,
} from '../../../../../UI/Ramp/Deposit/types/analytics';
import type { Quote } from '../../../../../UI/Ramp/types';
import type { AnalyticsUnfilteredProperties } from '../../../../../../util/analytics/analytics.types';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import { useTransactionPayFiatPayment } from '../../../hooks/pay/useTransactionPayData';
import { useAlerts } from '../../../context/alert-system-context';
import { AlertKeys } from '../../../constants/alerts';

/**
 * TRAM-3623 headless funnel telemetry for the Money "Add funds" deposit. Gated on
 * `TransactionType.moneyAccountDeposit`; tags HEADLESS / money_account / region.
 * Payloads typed against `AnalyticsEvents[KEY]` to enforce Segment-required fields.
 */

const RAMP_TYPE_HEADLESS = 'HEADLESS' as const;
const RAMP_SURFACE_MONEY_ACCOUNT: RampSurface = 'money_account';
const CURRENCY_SOURCE = 'USD';
// Transak auth happens later in the headless flow, so the user is not yet
// authenticated at these pre-checkout funnel steps.
const IS_AUTHENTICATED = false;

/** Reads a numeric field that the SDK may type as `number | string`. */
function toNumber(value: number | string | undefined): number {
  return Number(value ?? 0) || 0;
}

/** Fiat-per-crypto rate `(amountIn - totalFees) / amountOut`; 0 if no crypto out. */
function toExchangeRate(q: Quote['quote'] | undefined): number {
  const out = toNumber(q?.amountOut);
  return out > 0 ? (toNumber(q?.amountIn) - toNumber(q?.totalFees)) / out : 0;
}

export function useMoneyDepositFunnelMetrics() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const transactionMeta = useTransactionMetadataRequest();
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const fiatPayment = useTransactionPayFiatPayment();
  const { alerts } = useAlerts();
  const { userRegion } = useRampsUserRegion();
  const region = userRegion?.regionCode ?? '';

  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const rampsQuote = fiatPayment?.rampsQuote as Quote | undefined;
  const amountFiat = fiatPayment?.amountFiat;
  const assetId = fiatPayment?.caipAssetId;
  // CAIP chain id of the deposit asset; '' when the asset id is missing/malformed.
  const chainId = getChainIdFromAssetId(assetId ?? '') ?? '';

  // Base properties shared by every funnel event so the stream can be sliced by
  // headless surface and region.
  const baseProps = useMemo(
    () => ({
      ramp_type: RAMP_TYPE_HEADLESS,
      ramp_surface: RAMP_SURFACE_MONEY_ACCOUNT,
      region,
    }),
    [region],
  );

  const emit = useCallback(
    <T extends keyof AnalyticsEvents>(event: T, props: AnalyticsEvents[T]) => {
      const builder = createEventBuilder(MetaMetricsEvents[event]);
      const properties = props as unknown as AnalyticsUnfilteredProperties;
      trackEvent(builder.addProperties(properties).build());
    },
    [trackEvent, createEventBuilder],
  );

  // Dedupe guards so each semantic event fires once per occurrence on re-render.
  const lastSelectedPaymentMethodRef = useRef<string | undefined>(undefined);
  const lastQuoteSelectedKeyRef = useRef<string | undefined>(undefined);
  const lastQuoteErrorKeyRef = useRef<string | undefined>(undefined);

  // Amount committed (pre-quote): RAMPS_ORDER_PROPOSED. Imperative; no-op until
  // a valid amount is committed.
  const trackAmountCommitted = useCallback(() => {
    if (!isMoneyAccountDeposit) {
      return;
    }

    const amount = toNumber(amountFiat);
    if (amount <= 0) {
      return;
    }

    emit('RAMPS_ORDER_PROPOSED', {
      ...baseProps,
      amount_source: amount,
      // Crypto-out is only known once a quote arrives; 0 at amount-commit.
      amount_destination: toNumber(rampsQuote?.quote?.amountOut),
      payment_method_id: selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
      chain_id: chainId,
      is_authenticated: IS_AUTHENTICATED,
    });
  }, [
    isMoneyAccountDeposit,
    amountFiat,
    assetId,
    chainId,
    rampsQuote,
    baseProps,
    emit,
    selectedPaymentMethodId,
  ]);

  // PayWith selector opened: RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED. May not fire
  // when the #31641 auto-select flag short-circuits the selector (acceptable).
  const trackPaymentSelectorOpened = useCallback(() => {
    if (!isMoneyAccountDeposit) {
      return;
    }

    emit('RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED', {
      ...baseProps,
      location: 'Amount Input',
      current_payment_method: selectedPaymentMethodId,
    });
  }, [isMoneyAccountDeposit, baseProps, emit, selectedPaymentMethodId]);

  // Continue / Add Funds CTA: RAMPS_CONTINUE_BUTTON_CLICKED. Imperative; the
  // usable quote (RAMPS_ORDER_SELECTED) arrives reactively before this fires.
  const trackContinue = useCallback(() => {
    if (!isMoneyAccountDeposit) {
      return;
    }

    emit('RAMPS_CONTINUE_BUTTON_CLICKED', {
      ...baseProps,
      amount_source: toNumber(amountFiat),
      payment_method_id: selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
      chain_id: chainId,
    });
  }, [
    isMoneyAccountDeposit,
    amountFiat,
    assetId,
    chainId,
    baseProps,
    emit,
    selectedPaymentMethodId,
  ]);

  // Payment method changed: RAMPS_PAYMENT_METHOD_SELECTED. Reactive; fires once
  // per transition to a new defined method id.
  useEffect(() => {
    if (!isMoneyAccountDeposit || !selectedPaymentMethodId) {
      return;
    }

    if (lastSelectedPaymentMethodRef.current === selectedPaymentMethodId) {
      return;
    }

    lastSelectedPaymentMethodRef.current = selectedPaymentMethodId;
    emit('RAMPS_PAYMENT_METHOD_SELECTED', {
      ...baseProps,
      payment_method_id: selectedPaymentMethodId,
      is_authenticated: IS_AUTHENTICATED,
    });
  }, [isMoneyAccountDeposit, selectedPaymentMethodId, baseProps, emit]);

  // Usable quote received: RAMPS_ORDER_SELECTED with the full fee breakdown.
  // Reactive; fires once per new quote.
  useEffect(() => {
    if (!isMoneyAccountDeposit || !rampsQuote) {
      return;
    }

    const quoteDetails = rampsQuote.quote;
    const quoteKey = `${rampsQuote.provider ?? ''}:${
      quoteDetails?.amountIn ?? ''
    }:${quoteDetails?.amountOut ?? ''}`;

    if (lastQuoteSelectedKeyRef.current === quoteKey) {
      return;
    }

    lastQuoteSelectedKeyRef.current = quoteKey;
    emit('RAMPS_ORDER_SELECTED', {
      ...baseProps,
      amount_source: toNumber(quoteDetails?.amountIn),
      amount_destination: toNumber(quoteDetails?.amountOut),
      exchange_rate: toExchangeRate(quoteDetails),
      total_fee: toNumber(quoteDetails?.totalFees),
      gas_fee: toNumber(quoteDetails?.networkFee),
      processing_fee: toNumber(quoteDetails?.providerFee),
      payment_method_id:
        quoteDetails?.paymentMethod ?? selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
      chain_id: chainId,
    });
  }, [
    isMoneyAccountDeposit,
    rampsQuote,
    assetId,
    chainId,
    baseProps,
    emit,
    selectedPaymentMethodId,
  ]);

  // Quote failure: RAMPS_QUOTE_ERROR. Reactive; fires once per no-quotes or
  // buy-limit alert becoming active.
  const quoteErrorAlert = alerts.find(
    (candidate) =>
      candidate.key === AlertKeys.NoPayTokenQuotes ||
      candidate.key === AlertKeys.FiatBuyAmountLimit,
  );
  useEffect(() => {
    if (!isMoneyAccountDeposit) {
      return;
    }

    if (!quoteErrorAlert) {
      // Reset so a later re-occurrence of the same alert key emits again.
      lastQuoteErrorKeyRef.current = undefined;
      return;
    }

    const amount = toNumber(amountFiat);
    const errorKey = `${quoteErrorAlert.key}:${amount}:${
      selectedPaymentMethodId ?? ''
    }`;
    if (lastQuoteErrorKeyRef.current === errorKey) {
      return;
    }

    lastQuoteErrorKeyRef.current = errorKey;
    emit('RAMPS_QUOTE_ERROR', {
      ...baseProps,
      error_message:
        typeof quoteErrorAlert.message === 'string'
          ? quoteErrorAlert.message
          : undefined,
      amount,
      currency_source: CURRENCY_SOURCE,
      currency_destination: assetId ?? '',
      payment_method_id: selectedPaymentMethodId ?? '',
    });
  }, [
    isMoneyAccountDeposit,
    quoteErrorAlert,
    amountFiat,
    assetId,
    baseProps,
    emit,
    selectedPaymentMethodId,
  ]);

  return {
    trackAmountCommitted,
    trackPaymentSelectorOpened,
    trackContinue,
  };
}
