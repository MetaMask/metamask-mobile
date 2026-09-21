import { NativeModules } from 'react-native';

import Device from '../../../../util/device';
import { isCoinbaseProviderId } from './coinbaseEmbedded';

const GOOGLE_PAY_PAYMENT_METHOD_SUFFIX = 'google-pay';

/**
 * How long to wait for Play Services before treating the answer as unknown.
 * The bridge only calls back on a result; a failed Play Services connection
 * is logged natively and never surfaces, so an unbounded await could hang
 * the Continue button forever.
 */
export const GOOGLE_PAY_AVAILABILITY_TIMEOUT_MS = 3000;

export type GooglePayAvailability = 'available' | 'unavailable' | 'unknown';

/**
 * Whether a quote needs the native Google Pay preflight before its checkout
 * opens: Android, a Coinbase provider, and Google Pay as the payment method.
 * Coinbase serves Google Pay only through its embedded guest checkout, and
 * that page shows a dead "This purchase is unavailable" state with no event
 * when Google Pay cannot pay inside the WebView, so the app asks Play
 * Services first instead of reserving an order the user can never pay.
 *
 * @param providerId - The quote's provider id (e.g. "/providers/coinbase-m").
 * @param paymentMethodId - The payment method id (e.g. "/payments/google-pay").
 * @returns True when the preflight applies.
 */
export function needsGooglePayPreflight(
  providerId: string | undefined,
  paymentMethodId: string | undefined,
): boolean {
  return (
    Device.isAndroid() &&
    isCoinbaseProviderId(providerId) &&
    Boolean(paymentMethodId?.endsWith(GOOGLE_PAY_PAYMENT_METHOD_SUFFIX))
  );
}

interface ReactNativePaymentsModule {
  canMakePayments?: (
    paymentMethodData: { environment: 'PRODUCTION' | 'TEST' },
    onError: (error: unknown) => void,
    onResult: (canMakePayments: boolean) => void,
  ) => void;
}

/**
 * Asks Play Services whether Google Pay is ready to pay on this device
 * (`Wallet.Payments.isReadyToPay`, bridged by `@metamask/react-native-payments`).
 *
 * Only an explicit "no" from Play Services is reported as `'unavailable'`.
 * A missing bridge, a thrown error, or a slow response resolves `'unknown'`
 * so the checkout proceeds as it did before the preflight existed: a flaky
 * check must never lock a paying user out.
 *
 * @returns The availability verdict.
 */
export async function checkGooglePayAvailability(): Promise<GooglePayAvailability> {
  const canMakePayments = (
    NativeModules.ReactNativePayments as ReactNativePaymentsModule | undefined
  )?.canMakePayments;
  if (typeof canMakePayments !== 'function') {
    return 'unknown';
  }

  return new Promise<GooglePayAvailability>((resolve) => {
    const timeout = setTimeout(
      () => resolve('unknown'),
      GOOGLE_PAY_AVAILABILITY_TIMEOUT_MS,
    );
    const settle = (verdict: GooglePayAvailability) => {
      clearTimeout(timeout);
      resolve(verdict);
    };

    try {
      canMakePayments(
        // Coinbase drives the real Google Pay app even on its sandbox (the
        // sandbox flag lives on the payment link), so the production
        // readiness answer is the honest one.
        { environment: 'PRODUCTION' },
        () => settle('unknown'),
        (result) => settle(result === false ? 'unavailable' : 'available'),
      );
    } catch {
      settle('unknown');
    }
  });
}
