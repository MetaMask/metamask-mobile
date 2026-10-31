import type { VenueRequest, VenueRequestRef } from './venueRequest';

const TRADE_API = '/trade-api/v2';

/** Networks the demo activation sends. predict-api accepts the same list. */
export const KALSHI_WALLET_NETWORKS = ['base', 'polygon'] as const;
export type KalshiWalletNetwork = (typeof KALSHI_WALLET_NETWORKS)[number];

/** The only method and path each onboarding ref may be signed for. */
const ONBOARDING_ROUTES: Record<
  VenueRequestRef,
  { method: VenueRequest['method']; path: string }
> = {
  balance: { method: 'GET', path: `${TRADE_API}/portfolio/balance` },
  enrollment_current: {
    method: 'GET',
    path: `${TRADE_API}/isv/enrollment/intents/current`,
  },
  enrollment_intent: {
    method: 'POST',
    path: `${TRADE_API}/isv/enrollment/intents`,
  },
  link: { method: 'POST', path: `${TRADE_API}/isv/users/link` },
  link_verify: { method: 'POST', path: `${TRADE_API}/isv/users/link/verify` },
  wallet_register: { method: 'POST', path: `${TRADE_API}/isv/wallet/register` },
};

/**
 * True only when a request has the shape of one of the onboarding templates
 * above. The signing service uses this as its last check before it signs, so
 * it never signs a route, method, or query the phone does not define.
 */
export const isKalshiOnboardingTemplateRequest = (
  request: VenueRequest,
): boolean => {
  const route = ONBOARDING_ROUTES[request.ref];
  if (
    route === undefined ||
    route.method !== request.method ||
    route.path !== request.path ||
    request.query !== ''
  ) {
    return false;
  }
  if (request.method === 'GET') {
    return request.body === undefined && request.idempotencyKey === undefined;
  }
  return (
    typeof request.body === 'string' &&
    typeof request.idempotencyKey === 'string' &&
    request.idempotencyKey.length > 0
  );
};

export const balanceRequest = (): VenueRequest => ({
  ref: 'balance',
  method: 'GET',
  path: `${TRADE_API}/portfolio/balance`,
  query: '',
});

export const enrollmentCurrentRequest = (): VenueRequest => ({
  ref: 'enrollment_current',
  method: 'GET',
  path: `${TRADE_API}/isv/enrollment/intents/current`,
  query: '',
});

/** Empty body: the digest is of zero bytes. */
export const enrollmentIntentRequest = (
  idempotencyKey: string,
): VenueRequest => ({
  ref: 'enrollment_intent',
  method: 'POST',
  path: `${TRADE_API}/isv/enrollment/intents`,
  query: '',
  body: '',
  idempotencyKey,
});

/** The email is sent as typed after trim. Kalshi treats case itself. */
export const linkRequest = (
  email: string,
  idempotencyKey: string,
): VenueRequest => ({
  ref: 'link',
  method: 'POST',
  path: `${TRADE_API}/isv/users/link`,
  query: '',
  body: JSON.stringify({ email }),
  idempotencyKey,
});

export const linkVerifyRequest = (
  code: string,
  idempotencyKey: string,
): VenueRequest => ({
  ref: 'link_verify',
  method: 'POST',
  path: `${TRADE_API}/isv/users/link/verify`,
  query: '',
  body: JSON.stringify({ code }),
  idempotencyKey,
});

export const walletRegisterRequest = (input: {
  walletAddress: string;
  network: KalshiWalletNetwork;
  idempotencyKey: string;
}): VenueRequest => ({
  ref: 'wallet_register',
  method: 'POST',
  path: `${TRADE_API}/isv/wallet/register`,
  query: '',
  body: JSON.stringify({
    wallet_address: input.walletAddress,
    network: input.network,
  }),
  idempotencyKey: input.idempotencyKey,
});
