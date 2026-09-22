import { NativeModules } from 'react-native';

import Device from '../../../../util/device';
import { isCoinbaseProviderId } from './coinbaseEmbedded';

const GOOGLE_PAY_PAYMENT_METHOD_SUFFIX = 'google-pay';

// A failed Play Services connection never calls back, so bound the wait.
export const GOOGLE_PAY_AVAILABILITY_TIMEOUT_MS = 3000;

export type GooglePayAvailability = 'available' | 'unavailable' | 'unknown';

// Android + Coinbase + Google Pay: the embedded page shows a dead "unavailable"
// state with no event when Google Pay can't pay in the WebView.
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

// Only an explicit "no" from Play Services is 'unavailable'; a missing bridge,
// error or timeout is 'unknown' so a flaky check never locks a paying user out.
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
        // Coinbase uses the real Google Pay app even on its sandbox, so ask
        // for production readiness.
        { environment: 'PRODUCTION' },
        () => settle('unknown'),
        (result) => settle(result === false ? 'unavailable' : 'available'),
      );
    } catch {
      settle('unknown');
    }
  });
}
