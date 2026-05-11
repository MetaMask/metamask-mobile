import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';
import { redactUrlForAnalytics } from './redactUrlForAnalytics';

export type CloseSource =
  | 'user_close_button'
  | 'callback_success'
  | 'callback_error'
  | 'http_error'
  | 'background';

export interface FunnelBaseProps {
  checkout_session_id: string;
  location: 'Checkout';
  ramp_type: 'UNIFIED_BUY_2';
  provider_name?: string;
  ramp_routing?: UnifiedRampRoutingType;
}

export interface BuildBaseArgs {
  checkoutSessionId: string;
  providerName?: string;
  rampRouting?: UnifiedRampRoutingType | null;
}

export const buildBaseProps = ({
  checkoutSessionId,
  providerName,
  rampRouting,
}: BuildBaseArgs): FunnelBaseProps => ({
  checkout_session_id: checkoutSessionId,
  location: 'Checkout',
  ramp_type: 'UNIFIED_BUY_2',
  provider_name: providerName ?? undefined,
  ramp_routing: rampRouting ?? undefined,
});

export const extractHostname = (url: string): string | undefined => {
  try {
    return new URL(redactUrlForAnalytics(url)).hostname;
  } catch {
    return undefined;
  }
};
