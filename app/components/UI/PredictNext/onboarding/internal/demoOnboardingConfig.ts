/** Networks the demo activation offers. predict-api accepts the same list. */
export const KALSHI_WALLET_NETWORKS = ['base', 'polygon'] as const;
export type KalshiWalletNetwork = (typeof KALSHI_WALLET_NETWORKS)[number];

/**
 * Kalshi demo checks the payout wallet against Stripe's sandbox and rejects
 * arbitrary addresses (`STRIPE_PAYOUT_METHOD_INVALID`). This is the USDC on
 * Base address we were given for demo onboarding.
 */
export const DEMO_PAYOUT_WALLET = '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c';
export const DEMO_PAYOUT_NETWORK: KalshiWalletNetwork = 'base';
