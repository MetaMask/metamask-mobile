import type { AnalyticsEvents, RampSurface } from '../types/depositAnalytics';

export interface HeadlessOrderFailedPropsArgs {
  rampSurface?: RampSurface;
  /** Present when the failure occurs after an order exists (TRAM-3696). */
  providerOrderId?: string;
  amountSource: number;
  amountDestination: number;
  paymentMethodId: string;
  region: string;
  chainId: string;
  currencyDestination: string;
  currencyDestinationSymbol?: string;
  currencySource: string;
  errorMessage: string;
}

/**
 * Single source of truth for the headless `RAMPS_ORDER_FAILED` payload.
 *
 * Three checkout classes emit this event (the in-app Checkout WebView, the
 * native Transak flow, and the external-browser return path). Each used to
 * hand-write the property list, and the copies had already drifted: the
 * native flow carried `provider_order_id` and `currency_destination_symbol`
 * while the others silently dropped them. Both properties are optional in
 * the segment-schema definition (`ramps-order-failed.yaml`), so filling them
 * everywhere is additive for dashboards.
 *
 * Emitters own event dispatch (typed `trackEvent` vs the analytics
 * singleton); this builder owns only the shape.
 */
export function buildHeadlessOrderFailedProps(
  args: HeadlessOrderFailedPropsArgs,
): AnalyticsEvents['RAMPS_ORDER_FAILED'] {
  return {
    ramp_type: 'HEADLESS',
    ramp_surface: args.rampSurface,
    ...(args.providerOrderId
      ? { provider_order_id: args.providerOrderId }
      : {}),
    amount_source: args.amountSource,
    amount_destination: args.amountDestination,
    payment_method_id: args.paymentMethodId,
    region: args.region,
    chain_id: args.chainId,
    currency_destination: args.currencyDestination,
    ...(args.currencyDestinationSymbol
      ? { currency_destination_symbol: args.currencyDestinationSymbol }
      : {}),
    currency_source: args.currencySource,
    error_message: args.errorMessage,
    is_authenticated: true,
  };
}

export default buildHeadlessOrderFailedProps;
