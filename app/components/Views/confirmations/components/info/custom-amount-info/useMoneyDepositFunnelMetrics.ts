import { useCallback, useEffect, useMemo, useRef } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import type {
  AnalyticsUnfilteredProperties,
  IMetaMetricsEvent,
} from '../../../../../../util/analytics/analytics.types';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useRampsUserRegion } from '../../../../../UI/Ramp/hooks/useRampsUserRegion';
import type { RampSurface } from '../../../../../UI/Ramp/Deposit/types/analytics';
import type { Quote } from '../../../../../UI/Ramp/types';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../utils/transaction';
import { useTransactionPayFiatPayment } from '../../../hooks/pay/useTransactionPayData';
import { useAlerts } from '../../../context/alert-system-context';
import { AlertKeys } from '../../../constants/alerts';

/**
 * TRAM-3623 headless ramps funnel telemetry for the Money "Add funds" deposit
 * flow.
 *
 * `custom-amount-info` is shared across perps / predict / withdraw / mUSD
 * confirmations, so every emit here is gated on
 * `TransactionType.moneyAccountDeposit`. The money-account-deposit confirmation
 * always leads to the headless buy, so each event is tagged with
 * `ramp_type: 'HEADLESS'`, `ramp_surface: 'money_account'`, and the user's
 * `region` (from `RampsController`, matching how the foundation tags Checkout).
 *
 * These reuse the existing `Ramps`-prefixed events via the loose
 * `createEventBuilder(...).addProperties(...)` path (not the typed Ramp hook),
 * to avoid coupling confirmations to the Ramp typed analytics interfaces.
 *
 * The buy funnel (`RAMPS_*`) is intentionally distinct from the Money-surface
 * telemetry (`mm_pay_*`, `MONEY_SURFACE_VIEWED`); this hook does not touch the
 * latter.
 */

const RAMP_TYPE_HEADLESS = 'HEADLESS' as const;
const RAMP_SURFACE_MONEY_ACCOUNT: RampSurface = 'money_account';
const CURRENCY_SOURCE = 'usd';

/** Reads a numeric field that the SDK may type as `number | string`. */
function toNumber(value: number | string | undefined): number {
  return Number(value ?? 0) || 0;
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
    (event: IMetaMetricsEvent, properties: AnalyticsUnfilteredProperties) => {
      trackEvent(createEventBuilder(event).addProperties(properties).build());
    },
    [trackEvent, createEventBuilder],
  );

  // Dedupe guards so each semantic event fires once per occurrence on re-render.
  const lastSelectedPaymentMethodRef = useRef<string | undefined>(undefined);
  const lastQuoteSelectedKeyRef = useRef<string | undefined>(undefined);
  const lastQuoteErrorKeyRef = useRef<string | undefined>(undefined);

  // Amount committed (pre-quote). Fired imperatively from the Done handler when
  // a valid amount has been committed. Reuses RAMPS_ORDER_PROPOSED.
  const trackAmountCommitted = useCallback(() => {
    if (!isMoneyAccountDeposit) {
      return;
    }

    const amount = toNumber(amountFiat);
    if (amount <= 0) {
      return;
    }

    emit(MetaMetricsEvents.RAMPS_ORDER_PROPOSED, {
      ...baseProps,
      amount_source: amount,
      payment_method_id: selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
    });
  }, [
    isMoneyAccountDeposit,
    amountFiat,
    assetId,
    baseProps,
    emit,
    selectedPaymentMethodId,
  ]);

  // Payment selector opened. Fired imperatively when the PayWith selector is
  // opened. Reuses RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED. May not fire when the
  // #31641 auto-select flag short-circuits the selector (expected/acceptable).
  const trackPaymentSelectorOpened = useCallback(() => {
    if (!isMoneyAccountDeposit) {
      return;
    }

    emit(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED, {
      ...baseProps,
      location: 'Amount Input',
      current_payment_method: selectedPaymentMethodId,
    });
  }, [isMoneyAccountDeposit, baseProps, emit, selectedPaymentMethodId]);

  // Continue / Add Funds CTA. Fired imperatively from the confirm handler.
  // Reuses RAMPS_CONTINUE_BUTTON_CLICKED. Note: in the headless flow the usable
  // quote (RAMPS_ORDER_SELECTED) arrives reactively before this CTA fires.
  const trackContinue = useCallback(() => {
    if (!isMoneyAccountDeposit) {
      return;
    }

    emit(MetaMetricsEvents.RAMPS_CONTINUE_BUTTON_CLICKED, {
      ...baseProps,
      amount_source: toNumber(amountFiat),
      payment_method_id: selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
    });
  }, [
    isMoneyAccountDeposit,
    amountFiat,
    assetId,
    baseProps,
    emit,
    selectedPaymentMethodId,
  ]);

  // Payment method changed. Reactive: fires once each time the selected fiat
  // payment method id transitions to a new defined value. Reuses
  // RAMPS_PAYMENT_METHOD_SELECTED.
  useEffect(() => {
    if (!isMoneyAccountDeposit || !selectedPaymentMethodId) {
      return;
    }

    if (lastSelectedPaymentMethodRef.current === selectedPaymentMethodId) {
      return;
    }

    lastSelectedPaymentMethodRef.current = selectedPaymentMethodId;
    emit(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTED, {
      ...baseProps,
      payment_method_id: selectedPaymentMethodId,
    });
  }, [isMoneyAccountDeposit, selectedPaymentMethodId, baseProps, emit]);

  // Usable quote received. Reactive: fires once each time fiatPayment.rampsQuote
  // becomes usable. Reuses RAMPS_ORDER_SELECTED with the full fee breakdown.
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
    emit(MetaMetricsEvents.RAMPS_ORDER_SELECTED, {
      ...baseProps,
      amount_source: toNumber(quoteDetails?.amountIn),
      amount_destination: toNumber(quoteDetails?.amountOut),
      total_fee: toNumber(quoteDetails?.totalFees),
      gas_fee: toNumber(quoteDetails?.networkFee),
      processing_fee: toNumber(quoteDetails?.providerFee),
      payment_method_id:
        quoteDetails?.paymentMethod ?? selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
    });
  }, [
    isMoneyAccountDeposit,
    rampsQuote,
    assetId,
    baseProps,
    emit,
    selectedPaymentMethodId,
  ]);

  // Quote failure. Reactive: fires once each time the no-quotes or buy-limit
  // alert becomes active. Reuses RAMPS_QUOTE_ERROR.
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
    emit(MetaMetricsEvents.RAMPS_QUOTE_ERROR, {
      ramp_type: RAMP_TYPE_HEADLESS,
      ramp_surface: RAMP_SURFACE_MONEY_ACCOUNT,
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
    emit,
    selectedPaymentMethodId,
  ]);

  return {
    trackAmountCommitted,
    trackPaymentSelectorOpened,
    trackContinue,
  };
}
