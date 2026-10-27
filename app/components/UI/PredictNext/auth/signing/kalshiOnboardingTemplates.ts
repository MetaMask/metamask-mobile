import type { VenueRequest } from './venueRequest';

const TRADE_API = '/trade-api/v2';

/** Networks the demo activation sends. predict-api accepts the same list. */
export const KALSHI_WALLET_NETWORKS = ['base', 'polygon'] as const;
export type KalshiWalletNetwork = (typeof KALSHI_WALLET_NETWORKS)[number];

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
