import { CROSSMINT_CHECKOUT_SDK_PATH } from './constants';
import {
  getCrossmintBaseUrl,
  getCrossmintClientApiKey,
} from './config';

export interface BuildCheckoutUrlParams {
  orderId: string;
  clientSecret: string;
  /**
   * When true, only Apple Pay is offered in the hosted checkout.
   * Defaults to true for the FOMO-style P0 path.
   */
  applePayOnly?: boolean;
}

/**
 * Builds the SDK-less embedded checkout URL used by FOMO / Crossmint's
 * expo-headless-webview-minimal demo.
 */
export function buildCrossmintCheckoutUrl({
  orderId,
  clientSecret,
  applePayOnly = true,
}: BuildCheckoutUrlParams): string {
  const apiKey = getCrossmintClientApiKey();
  if (!apiKey) {
    throw new Error(
      'Missing MM_CROSSMINT_CLIENT_API_KEY. Add a Crossmint client API key to .js.env.',
    );
  }

  const payment = applePayOnly
    ? {
        crypto: { enabled: false },
        fiat: {
          enabled: true,
          defaultCurrency: 'usd',
          allowedMethods: {
            card: false,
            googlePay: false,
            applePay: true,
          },
        },
        defaultMethod: 'fiat',
      }
    : {
        crypto: { enabled: false },
        fiat: {
          enabled: true,
          defaultCurrency: 'usd',
          allowedMethods: {
            card: true,
            googlePay: false,
            applePay: true,
          },
        },
        defaultMethod: 'fiat',
      };

  const appearance = {
    rules: {
      DestinationInput: { display: 'hidden' },
      ReceiptEmailInput: { display: 'hidden' },
    },
  };

  const query = new URLSearchParams({
    orderId,
    clientSecret,
    apiKey,
    payment: JSON.stringify(payment),
    appearance: JSON.stringify(appearance),
  });

  return `${getCrossmintBaseUrl()}${CROSSMINT_CHECKOUT_SDK_PATH}?${query.toString()}`;
}
