import { toChecksumHexAddress } from '@metamask/controller-utils';

import {
  KALSHI_WALLET_NETWORKS,
  type KalshiWalletNetwork,
} from '../../auth/signing/kalshiOnboardingTemplates';

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;

/**
 * Build env, never a remote flag: this flow must not reach production.
 * Babel inlines `process.env`, so callers pass the value and tests pass it
 * directly.
 */
export const isKalshiDemoOnboardingEnabled = (
  flag: string | undefined = process.env.MM_PREDICT_KALSHI_DEMO_ONBOARDING,
): boolean => flag === 'true';

/**
 * Kalshi demo checks the payout wallet against Stripe's sandbox and rejects
 * real-looking addresses (`STRIPE_PAYOUT_METHOD_INVALID`). The one address
 * Stripe documents for crypto payouts, with the network its example uses.
 */
export const DEMO_PAYOUT_WALLET = '0x1234567890abcdef1234567890abcdef12345678';
export const DEMO_PAYOUT_NETWORK: KalshiWalletNetwork = 'polygon';

/** Set the wallet env to this to sign the selected account instead. */
export const USE_SELECTED_ACCOUNT = 'account';

export const kalshiDemoPayoutNetwork = (
  configured: string | undefined = process.env
    .MM_PREDICT_KALSHI_DEMO_PAYOUT_NETWORK,
): KalshiWalletNetwork =>
  (KALSHI_WALLET_NETWORKS as readonly string[]).includes(configured ?? '')
    ? (configured as KalshiWalletNetwork)
    : DEMO_PAYOUT_NETWORK;

/**
 * The address the wallet step shows and `wallet_register` signs. Defaults to
 * the Stripe sandbox address, since demo rejects real ones. The env value
 * replaces it, and `account` signs the selected EVM account instead. EIP-55,
 * because Kalshi requires a checksummed address.
 */
export const kalshiDemoPayoutWallet = (
  selectedEvmAddress: string | undefined,
  override: string | undefined = process.env
    .MM_PREDICT_KALSHI_DEMO_PAYOUT_WALLET,
): string | undefined => {
  const configured = override?.trim();
  const address =
    configured?.toLowerCase() === USE_SELECTED_ACCOUNT
      ? selectedEvmAddress
      : configured || DEMO_PAYOUT_WALLET;
  if (!address || !EVM_ADDRESS.test(address)) {
    return undefined;
  }
  return toChecksumHexAddress(address);
};
