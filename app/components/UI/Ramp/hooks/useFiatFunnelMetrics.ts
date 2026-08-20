import { useCallback, useEffect, useMemo, useRef } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import useAnalytics from './useAnalytics';
import { useRampsUserRegion } from './useRampsUserRegion';
import { getChainIdFromAssetId } from '../headless';
import { RAMP_SURFACE, type RampSurface } from '../types/depositAnalytics';
import type { Quote } from '../types';

/**
 * TRAM-3623 headless ramps funnel telemetry, owned by ramps (money-movement).
 * Arg-driven and generic: every emitter/effect is inert unless `rampSurface` is
 * supplied, so any headless deposit surface (money / perps / prediction) can
 * wire it via a thin adapter. Payloads are typed by the ramps `useAnalytics`.
 */

const RAMP_TYPE_HEADLESS = 'HEADLESS' as const;
const CURRENCY_SOURCE = 'USD';
// Transak auth happens later, so the user is not authenticated pre-checkout.
const IS_AUTHENTICATED = false;

export interface FiatFunnelMetricsInput {
  /** Headless surface tag; emitters are inert (no-op) while undefined. */
  rampSurface?: RampSurface;
  region: string;
  selectedPaymentMethodId?: string;
  rampsQuote?: Quote;
  amountFiat?: string | number;
  assetId?: string;
  quoteError?: { key: string; message?: string };
}

export interface FiatFunnelMetricsResult {
  trackScreenViewed: () => void;
  trackAmountCommitted: () => void;
  trackPaymentSelectorOpened: () => void;
  trackContinue: () => void;
}

export interface FiatPaymentSelectorMetricsInput {
  rampSurface?: RampSurface;
  currentPaymentMethodId?: string;
}

/** Reads a numeric field that the SDK may type as `number | string`. */
function toNumber(value: number | string | undefined): number {
  return Number(value ?? 0) || 0;
}

const TRANSACTION_TYPE_TO_RAMP_SURFACE: Partial<
  Record<TransactionType, RampSurface>
> = {
  [TransactionType.moneyAccountDeposit]: RAMP_SURFACE.MONEY_ACCOUNT,
};

export function getFiatFunnelRampSurface(
  transactionType: TransactionType | undefined,
): RampSurface | undefined {
  return transactionType
    ? TRANSACTION_TYPE_TO_RAMP_SURFACE[transactionType]
    : undefined;
}

/**
 * RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED payload shared by funnel emitters.
 */
export function buildSelectorOpenedPayload(
  rampSurface: RampSurface,
  region: string,
  currentPaymentMethodId: string | undefined,
) {
  return {
    ramp_type: RAMP_TYPE_HEADLESS,
    ramp_surface: rampSurface,
    region,
    location: 'Amount Input',
    current_payment_method: currentPaymentMethodId,
  } as const;
}

export function useFiatPaymentSelectorMetrics({
  rampSurface,
  currentPaymentMethodId,
}: FiatPaymentSelectorMetricsInput): void {
  const trackEvent = useAnalytics();
  const { userRegion } = useRampsUserRegion();
  const region = userRegion?.regionCode ?? '';

  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current || !rampSurface) return;

    hasTrackedRef.current = true;
    trackEvent(
      'RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED',
      buildSelectorOpenedPayload(rampSurface, region, currentPaymentMethodId),
    );
  }, [rampSurface, region, currentPaymentMethodId, trackEvent]);
}

/** Fiat-per-crypto rate `(amountIn - totalFees) / amountOut`; 0 if no crypto out. */
function toExchangeRate(q: Quote['quote'] | undefined): number {
  const out = toNumber(q?.amountOut);
  return out > 0 ? (toNumber(q?.amountIn) - toNumber(q?.totalFees)) / out : 0;
}

export function useFiatFunnelMetrics(
  input: FiatFunnelMetricsInput,
): FiatFunnelMetricsResult {
  const trackEvent = useAnalytics();
  const {
    rampSurface,
    region,
    selectedPaymentMethodId,
    rampsQuote,
    amountFiat,
    assetId,
    quoteError,
  } = input;

  // CAIP chain id of the deposit asset; '' when missing/malformed.
  const chainId = getChainIdFromAssetId(assetId ?? '') ?? '';

  // Shared on every event so the stream can be sliced by surface and region.
  const baseProps = useMemo(
    () => ({
      ramp_type: RAMP_TYPE_HEADLESS,
      ramp_surface: rampSurface,
      region,
    }),
    [rampSurface, region],
  );

  // Dedupe guards so each semantic event fires once per occurrence on re-render.
  const hasTrackedScreenViewRef = useRef(false);
  const lastSelectedPaymentMethodRef = useRef<string | undefined>(undefined);
  const lastQuoteSelectedKeyRef = useRef<string | undefined>(undefined);
  const lastQuoteErrorKeyRef = useRef<string | undefined>(undefined);

  // RAMPS_SCREEN_VIEWED. Imperative; fired once on mount by the caller's effect.
  const trackScreenViewed = useCallback(() => {
    if (!rampSurface || hasTrackedScreenViewRef.current) return;
    hasTrackedScreenViewRef.current = true;
    trackEvent('RAMPS_SCREEN_VIEWED', {
      location: 'Amount Input',
      ...baseProps,
    });
  }, [rampSurface, baseProps, trackEvent]);

  // RAMPS_ORDER_PROPOSED (amount committed, pre-quote). Imperative.
  const trackAmountCommitted = useCallback(() => {
    if (!rampSurface) return;

    const amount = toNumber(amountFiat);
    if (amount <= 0) return;

    trackEvent('RAMPS_ORDER_PROPOSED', {
      ...baseProps,
      amount_source: amount,
      // Crypto-out is known only once a quote arrives; 0 at amount-commit.
      amount_destination: toNumber(rampsQuote?.quote?.amountOut),
      payment_method_id: selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
      chain_id: chainId,
      is_authenticated: IS_AUTHENTICATED,
    });
  }, [
    rampSurface,
    amountFiat,
    assetId,
    chainId,
    rampsQuote,
    baseProps,
    trackEvent,
    selectedPaymentMethodId,
  ]);

  // RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED. Imperative for callers that own the
  // selector action directly.
  const trackPaymentSelectorOpened = useCallback(() => {
    if (!rampSurface) return;
    trackEvent(
      'RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED',
      buildSelectorOpenedPayload(rampSurface, region, selectedPaymentMethodId),
    );
  }, [rampSurface, region, selectedPaymentMethodId, trackEvent]);

  // RAMPS_CONTINUE_BUTTON_CLICKED (Continue / Add Funds CTA). Imperative.
  const trackContinue = useCallback(() => {
    if (!rampSurface) return;

    trackEvent('RAMPS_CONTINUE_BUTTON_CLICKED', {
      ...baseProps,
      amount_source: toNumber(amountFiat),
      payment_method_id: selectedPaymentMethodId ?? '',
      currency_destination: assetId ?? '',
      currency_source: CURRENCY_SOURCE,
      chain_id: chainId,
    });
  }, [
    rampSurface,
    amountFiat,
    assetId,
    chainId,
    baseProps,
    trackEvent,
    selectedPaymentMethodId,
  ]);

  // RAMPS_PAYMENT_METHOD_SELECTED. Reactive; once per new defined method id.
  useEffect(() => {
    if (!rampSurface || !selectedPaymentMethodId) return;
    if (lastSelectedPaymentMethodRef.current === selectedPaymentMethodId)
      return;

    lastSelectedPaymentMethodRef.current = selectedPaymentMethodId;
    trackEvent('RAMPS_PAYMENT_METHOD_SELECTED', {
      ...baseProps,
      payment_method_id: selectedPaymentMethodId,
      is_authenticated: IS_AUTHENTICATED,
    });
  }, [rampSurface, selectedPaymentMethodId, baseProps, trackEvent]);

  // RAMPS_ORDER_SELECTED with the fee breakdown. Reactive; once per new quote.
  useEffect(() => {
    if (!rampSurface || !rampsQuote) return;

    const quoteDetails = rampsQuote.quote;
    const quoteKey = `${rampsQuote.provider ?? ''}:${
      quoteDetails?.amountIn ?? ''
    }:${quoteDetails?.amountOut ?? ''}`;

    if (lastQuoteSelectedKeyRef.current === quoteKey) return;

    lastQuoteSelectedKeyRef.current = quoteKey;
    trackEvent('RAMPS_ORDER_SELECTED', {
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
    rampSurface,
    rampsQuote,
    assetId,
    chainId,
    baseProps,
    trackEvent,
    selectedPaymentMethodId,
  ]);

  // RAMPS_QUOTE_ERROR. Reactive; once per error becoming active.
  useEffect(() => {
    if (!rampSurface) return;

    if (!quoteError) {
      // Reset so a later re-occurrence of the same error key emits again.
      lastQuoteErrorKeyRef.current = undefined;
      return;
    }

    const amount = toNumber(amountFiat);
    const errorKey = `${quoteError.key}:${amount}:${
      selectedPaymentMethodId ?? ''
    }`;
    if (lastQuoteErrorKeyRef.current === errorKey) return;

    lastQuoteErrorKeyRef.current = errorKey;
    trackEvent('RAMPS_QUOTE_ERROR', {
      ...baseProps,
      error_message: quoteError.message,
      amount,
      currency_source: CURRENCY_SOURCE,
      currency_destination: assetId ?? '',
      payment_method_id: selectedPaymentMethodId ?? '',
    });
  }, [
    rampSurface,
    quoteError,
    amountFiat,
    assetId,
    baseProps,
    trackEvent,
    selectedPaymentMethodId,
  ]);

  return {
    trackScreenViewed,
    trackAmountCommitted,
    trackPaymentSelectorOpened,
    trackContinue,
  };
}
