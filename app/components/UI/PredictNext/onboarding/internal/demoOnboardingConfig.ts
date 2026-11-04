import { toChecksumHexAddress } from '@metamask/controller-utils';

/** Networks the demo activation offers. predict-api accepts the same list. */
export const KALSHI_WALLET_NETWORKS = ['base', 'polygon'] as const;
export type KalshiWalletNetwork = (typeof KALSHI_WALLET_NETWORKS)[number];

/**
 * Demo onboarding is enabled by default.
 */
export const isKalshiDemoOnboardingEnabled = (): boolean => true;

/**
 * Kalshi demo checks the payout wallet against Stripe's sandbox and rejects
 * arbitrary addresses (`STRIPE_PAYOUT_METHOD_INVALID`). This is the USDC on
 * Base address we were given for demo onboarding.
 */
export const DEMO_PAYOUT_WALLET = '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c';
export const DEMO_PAYOUT_NETWORK: KalshiWalletNetwork = 'base';

export const kalshiDemoPayoutNetwork = (): KalshiWalletNetwork =>
  DEMO_PAYOUT_NETWORK;

/**
 * The address the wallet step shows and `wallet_register` signs. Defaults to
 * the Stripe sandbox address, since demo rejects real ones. EIP-55,
 * because Kalshi requires a checksummed address.
 */
export const kalshiDemoPayoutWallet = (_selectedEvmAddress?: string): string =>
  toChecksumHexAddress(DEMO_PAYOUT_WALLET);
