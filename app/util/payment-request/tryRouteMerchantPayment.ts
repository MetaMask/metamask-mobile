import Routes from '../../constants/navigation/Routes';
import { isMerchantPaymentUri } from './parsePaymentUri';
import { isPaymentSystemEnabled } from './isPaymentSystemEnabled';

interface TryRouteMerchantPaymentParams {
  /** Raw scanned/deeplinked URI content. */
  content: string;
  /** React Navigation `navigate` callback. */
  navigate: (name: string, params?: object) => void;
  /** Origin string forwarded to the confirmation screen. */
  origin?: string;
}

/**
 * Central router for merchant payment URIs.
 *
 * When the feature flag is on AND the content is a merchant payment URI
 * (EIP-681 + our metadata params), navigates to the customer-side
 * confirmation screen and returns true. Otherwise returns false so the
 * caller can fall through to existing send/deeplink handling.
 */
export function tryRouteMerchantPayment({
  content,
  navigate,
  origin,
}: TryRouteMerchantPaymentParams): boolean {
  if (!isPaymentSystemEnabled()) {
    return false;
  }
  if (!content || !isMerchantPaymentUri(content)) {
    return false;
  }
  navigate(Routes.PAY_MERCHANT.CONFIRMATION, { uri: content, origin });
  return true;
}
